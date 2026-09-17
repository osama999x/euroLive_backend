import { AccountType, TokenType } from '../enums';

export interface JwtPayload {
  sub: string;
  email?: string;
  username?: string;
  accountType?: AccountType;
  role?: string;
  roles?: string[];
  permissions?: string[];
  typ?: TokenType;
  jti?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}
