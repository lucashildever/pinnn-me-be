export interface SessionStatusDto {
  status: string | null;
  payment_status: string;
  customer_email: string | null | undefined;
  amount_total: number | null;
  currency: string | null;
}
