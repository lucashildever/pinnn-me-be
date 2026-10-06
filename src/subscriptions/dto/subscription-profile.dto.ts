export interface SubscriptionProfileDto {
  planType: 'free' | 'pro';
  limits: Record<string, any>;
  features: string[];
}
