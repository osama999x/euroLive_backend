import { HttpStatus } from '@nestjs/common';
import { BanDuration } from '../../common/enums';
import { AppException } from '../../common/exceptions';

const HOURS: Record<string, number> = {
  [BanDuration.HOURS_1]: 1,
  [BanDuration.HOURS_24]: 24,
  [BanDuration.DAYS_7]: 7 * 24,
  [BanDuration.DAYS_30]: 30 * 24,
};

export function banExpiresAt(duration: BanDuration, customHours?: number): Date | null {
  if (duration === BanDuration.PERMANENT) {
    return null;
  }
  let hours = HOURS[duration];
  if (duration === BanDuration.CUSTOM) {
    if (!customHours || customHours < 1) {
      throw new AppException('customHours is required for custom duration', HttpStatus.BAD_REQUEST);
    }
    hours = customHours;
  }
  if (!hours) {
    throw new AppException('Invalid ban duration', HttpStatus.BAD_REQUEST);
  }
  return new Date(Date.now() + hours * 3600_000);
}

export function banIsActive(row: { revokedAt?: Date; expiresAt?: Date }): boolean {
  if (row.revokedAt) {
    return false;
  }
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return false;
  }
  return true;
}
