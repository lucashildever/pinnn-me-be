import { SubscriptionProfileDto } from 'src/subscriptions/dto/subscription-profile.dto';

export interface AuthResponseDto {
  access_token: string;
  refresh_token: string;
  user: AuthenticatedProfileDto;
  subscription: SubscriptionProfileDto;
}

export interface ValidateResponseDto {
  user: AuthenticatedProfileDto;
}

export interface AuthenticatedProfileDto {
  id: string;
  email: string;
  username: string;
  activeMuralId: string;
}
