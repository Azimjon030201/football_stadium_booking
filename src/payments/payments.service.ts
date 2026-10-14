import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  PaymentProviderType,
  PaymentStatus,
  Prisma, UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentErrors } from './payments.errors';
import { MockPaymentProvider } from './providers/mock-provider';
import { PaymentProvider } from './providers/payment-provider.interface';

const FINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.SUCCESS,
  PaymentStatus.FAILED,
  PaymentStatus.REFUNDED,
];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Partial<Record<PaymentProviderType, PaymentProvider>>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    mockProvider: MockPaymentProvider,
  ) {
    this.providers = { [PaymentProviderType.MOCK]: mockProvider };
  }

  // ───────────────────────── POST /payments/initiate ─────────────────────────
  async initiate(userId: string, dto: InitiatePaymentDto) {
    const providerType = dto.provider ?? PaymentProviderType.MOCK;
    const provider = this.getProvider(providerType);

    // 1-bosqich (qisqa transaction): booking'ni qulflab, holatni tekshirish
    // PENDING -> PAYMENT_PENDING va Payment(INITIATED) yaratish/yangilash
    const payment = await this.prisma.$transaction(
      async (tx) => {
        // Parallel initiate'lardan himoya: booking qatorini qulflaymiz
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${dto.bookingId} FOR UPDATE`;

        const booking = await tx.booking.findUnique({
          where: { id: dto.bookingId },
          include: { payment: true },
        });

        if (!booking) {
          throw new NotFoundException({ error: PaymentErrors.BOOKING_NOT_FOUND });
        }
        if (booking.userId !== userId) {
          throw new ForbiddenException({ error: PaymentErrors.FORBIDDEN_RESOURCE });
        }

        // Kelishuv: faqat PENDING holatda to'lov boshlanadi
        if (booking.status !== BookingStatus.PENDING) {
          const messages: Partial<Record<BookingStatus, string>> = {
            [BookingStatus.CONFIRMED]: "Bron allaqachon tasdiqlangan, qayta to'lov mumkin emas.",
            [BookingStatus.CANCELLED]: "Bron bekor qilingan, to'lov mumkin emas.",
            [BookingStatus.PAYMENT_PENDING]: "Bu bron uchun to'lov allaqachon boshlangan.",
            [BookingStatus.EXPIRED]: "Bronning to'lov muddati tugagan.",
          };
          throw new ConflictException({
            error: PaymentErrors.BOOKING_INVALID_STATE,
            message:
              messages[booking.status] ??
              `Booking holati ${booking.status}. To'lov faqat PENDING holatda boshlanadi.`,
            currentStatus: booking.status,
          });
        }

        // CRON hali ulgurmagan bo'lsa ham muddati o'tgan bronga to'lov boshlanmaydi
        if (this.isPaymentWindowExpired(booking.createdAt)) {
          throw new ConflictException({
            error: PaymentErrors.BOOKING_INVALID_STATE,
            message: "Bronning to'lov muddati tugagan.",
            currentStatus: booking.status,
          });
        }

        // Payment 1:1 (bookingId unique) -> faqat FAILED payment qayta ishlatiladi
        if (booking.payment && booking.payment.status !== PaymentStatus.FAILED) {
          throw new ConflictException({ error: PaymentErrors.PAYMENT_ALREADY_PROCESSED });
        }

        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.PAYMENT_PENDING },
        });

        const data = {
          amount: booking.price, // faqat backend hisoblagan narx (BR-PRICE-1)
          currency: 'UZS',
          provider: providerType,
          status: PaymentStatus.INITIATED,
          transactionId: null,
          idempotencyKey: randomUUID(),
        };

        return booking.payment
          ? tx.payment.update({ where: { id: booking.payment.id }, data })
          : tx.payment.create({ data: { ...data, bookingId: booking.id } });
      },
      { timeout: 10000 },
    );

    // 2-bosqich: provider chaqiruvi transaction TASHQARISIDA (SRS 49-bo'lim)
    try {
      const result = await provider.initiate({
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amount: Number(payment.amount),
        currency: payment.currency,
        idempotencyKey: payment.idempotencyKey,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PENDING, transactionId: result.transactionId },
      });

      this.logger.log({ event: 'PAYMENT_INITIATED', paymentId: payment.id, bookingId: payment.bookingId });

      return {
        paymentId: updated.id,
        bookingId: updated.bookingId,
        status: updated.status,
        amount: updated.amount,
        currency: updated.currency,
        provider: updated.provider,
        transactionId: updated.transactionId,
        redirectUrl: result.redirectUrl ?? null,
      };
    } catch (err) {
      // Kompensatsiya: provider ishlamadi -> booking PENDING'ga qaytadi (qayta urinish mumkin)
      this.logger.error({ event: 'PAYMENT_INITIATE_FAILED', paymentId: payment.id, err: String(err) });
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        }),
        this.prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: BookingStatus.PENDING },
        }),
      ]);
      throw new HttpException({ error: PaymentErrors.PAYMENT_FAILED }, HttpStatus.PAYMENT_REQUIRED);
    }
  }

  // ───────────────────── POST /payments/webhook/:provider ─────────────────────
  async handleWebhook(
    providerParam: string,
    rawBody: Buffer,
    signature: string | undefined,
    dto: PaymentWebhookDto,
  ) {
    const provider = this.getProvider(providerParam.toUpperCase() as PaymentProviderType);

    // BR-PAY-1: faqat server-to-server, HMAC imzosi bilan
    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException({ error: PaymentErrors.INVALID_WEBHOOK_SIGNATURE });
    }

    await this.prisma.$transaction(
      async (tx) => {
        const found = await tx.payment.findUnique({ where: { transactionId: dto.transactionId } });
        if (!found) {
          throw new NotFoundException({ error: PaymentErrors.PAYMENT_NOT_FOUND });
        }

        // Parallel webhook'lardan himoya: payment qatorini qulflaymiz
        await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${found.id} FOR UPDATE`;
        const payment = await tx.payment.findUniqueOrThrow({ where: { id: found.id } });

        // BR-PAY-2: idempotency -> final holatda bo'lsa qayta ishlanmaydi
        if (FINAL_PAYMENT_STATUSES.includes(payment.status)) {
          this.logger.log({ event: 'PAYMENT_WEBHOOK_DUPLICATE', paymentId: payment.id });
          return;
        }

        if (!new Prisma.Decimal(dto.amount).equals(payment.amount)) {
          throw new BadRequestException({ error: PaymentErrors.PAYMENT_AMOUNT_MISMATCH });
        }

        const booking = await tx.booking.findUniqueOrThrow({
          where: { id: payment.bookingId },
          include: { field: { select: { stadium: { select: { ownerId: true } } } } },
        });

        if (dto.status === 'SUCCESS') {
          if (booking.status === BookingStatus.PAYMENT_PENDING) {
            await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.SUCCESS } });
            await tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CONFIRMED } });

            await tx.notification.createMany({
              data: [
                { userId: booking.userId, type: 'PAYMENT_SUCCESSFUL', title: "To'lov muvaffaqiyatli", body: "To'lovingiz qabul qilindi.", metadata: { bookingId: booking.id } },
                { userId: booking.userId, type: 'BOOKING_CONFIRMED', title: 'Bron tasdiqlandi', body: 'Broningiz tasdiqlandi.', metadata: { bookingId: booking.id } },
                { userId: booking.field.stadium.ownerId, type: 'BOOKING_CONFIRMED', title: 'Yangi bron', body: 'Stadioningizda yangi bron tasdiqlandi.', metadata: { bookingId: booking.id } },
              ],
            });
          } else {
            // Kech kelgan to'lov (bron EXPIRED/CANCELLED bo'lgan): pul qaytariladi, bron tiklanmaydi
            this.logger.warn({ event: 'LATE_PAYMENT_REFUNDED', paymentId: payment.id, bookingStatus: booking.status });
            await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
          }
          return;
        }

        // FAILED: muddat o'tmagan bo'lsa PENDING (qayta urinish), aks holda EXPIRED
        await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
        if (booking.status === BookingStatus.PAYMENT_PENDING) {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: this.isPaymentWindowExpired(booking.createdAt)
                ? BookingStatus.EXPIRED
                : BookingStatus.PENDING,
            },
          });
        }
      },
      { timeout: 10000 },
    );

    return { received: true };
  }

  // ───────────────────────────── GET /payments/:id ─────────────────────────────
  async getById(user: { id: string; role: UserRole }, id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        booking: { select: { userId: true, field: { select: { stadium: { select: { ownerId: true } } } } } },
      },
    });
    if (!payment) throw new NotFoundException({ error: PaymentErrors.PAYMENT_NOT_FOUND });

    const isAdmin = user.role === UserRole.ADMIN;
    const isBookingUser = payment.booking.userId === user.id;
    const isStadiumOwner = payment.booking.field.stadium.ownerId === user.id;
    if (!isAdmin && !isBookingUser && !isStadiumOwner) {
      throw new ForbiddenException({ error: PaymentErrors.FORBIDDEN_RESOURCE });
    }

    const { booking: _omit, ...result } = payment;
    return result;
  }

  // ────────────────────────────────── helpers ──────────────────────────────────
  private getProvider(type: PaymentProviderType): PaymentProvider {
    const provider = this.providers[type];
    if (!provider) throw new BadRequestException({ error: PaymentErrors.UNKNOWN_PROVIDER });
    return provider;
  }

  private isPaymentWindowExpired(createdAt: Date): boolean {
    const minutes = this.config.get<number>('PAYMENT_EXPIRATION_MINUTES', 15);
    return createdAt.getTime() + minutes * 60_000 < Date.now();
  }
}