export const FORM_FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'select',
  'textarea',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[]; // for 'select' type
}

export interface FormConfig {
  title?: string;
  submitButtonText?: string;
  successMessage?: string;
  fields: FormField[];
}

export type CallToActionConfig =
  | { type: 'profile'; link: string }
  | { type: 'banner'; text: string; link: string }
  | { type: 'form'; formConfig: FormConfig };
