import { INVOICE_TYPES } from '../constants/invoice-types.constant';

export type InvoiceType = (typeof INVOICE_TYPES)[keyof typeof INVOICE_TYPES];
