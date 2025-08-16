export interface AuthResponseDto {
  access_token: string;
  user: AuthenticatedProfileDto;
}

export interface AuthenticatedProfileDto {
  id: string;
  email: string;
  username: string;
}
