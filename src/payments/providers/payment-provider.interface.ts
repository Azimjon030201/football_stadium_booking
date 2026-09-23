// Barcha to'lov provayderlari (Mock, kelajakda Click/Payme/Uzum) shu
// interfeysga rioya qiladi (Strategy Pattern).
// Batafsil: Dev5 qo'llanma, 6-BOB, TASK-02
export interface PaymentProviderInterface {
  initiate(
    amount: number,
    bookingId: string,
  ): Promise<{ transactionId: string; status: string }>;
}
