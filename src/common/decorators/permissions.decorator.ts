import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants';
import { ResellerPermissionFlag } from '../enums';

export const RequirePermissions = (...permissions: ResellerPermissionFlag[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
