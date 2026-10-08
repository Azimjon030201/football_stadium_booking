// Loyihada allaqachon bor bo'lsa, shuni ishlating (faqat imzo mos bo'lsin).
export interface PaymentProviderInterface {
  initiate(
    amount: number,
    bookingId: string,
  ): Promise<{ transactionId: string; status: string }>;
}