import { SetMetadata } from '@nestjs/common';
import { ACCOUNT_TYPES_KEY } from '../constants';
import { AccountType } from '../enums';

export const AccountTypes = (...types: AccountType[]) =>
  SetMetadata(ACCOUNT_TYPES_KEY, types);
