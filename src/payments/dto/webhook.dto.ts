export class WebhookDto {
  transactionId: string;
  bookingId: string;
  status: 'SUCCESS' | 'FAILED';
  amount: number;
  idempotencyKey: string;
}
