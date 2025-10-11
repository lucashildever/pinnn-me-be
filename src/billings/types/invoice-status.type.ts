import { INVOICE_STATUSES } from '../constants/invoice-status.constant';

export type InvoiceStatus =
  (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES];
