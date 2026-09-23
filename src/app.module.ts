import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StadiumsModule } from './stadiums/stadiums.module';
import { FieldsModule } from './fields/fields.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';

// Yangi modul qo'shsangiz (Review, Favorite, Notification, Owner, Admin,
// Audit, Cron — SRS'dagi kichik modullar), shu yerga import qiling.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 900000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    StadiumsModule,
    FieldsModule,
    AvailabilityModule,
    BookingsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
