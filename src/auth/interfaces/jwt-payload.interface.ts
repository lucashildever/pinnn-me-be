export interface JwtPayload {
  email: string;
  sub: number; // user id
  iat?: number; // issued at
  exp?: number; // expiration time
}
