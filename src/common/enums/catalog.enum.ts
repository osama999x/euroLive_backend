export enum CatalogItemType {
  FRAME = 'frame',
  ENTRY = 'entry',
  BADGE = 'badge',
}

export enum UserItemStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REMOVED = 'removed',
}

export enum UserItemSource {
  ADMIN = 'admin',
  RESELLER = 'reseller',
  STORE = 'store',
}

export enum AssignDuration {
  DAYS_1 = '1',
  DAYS_7 = '7',
  DAYS_30 = '30',
  CUSTOM = 'custom',
  PERMANENT = 'permanent',
}

export enum ResellerPermissionFlag {
  RECHARGE = 'recharge',
  FRAME = 'frame',
  ENTRY = 'entry',
  BADGE = 'badge',
  REMOVE = 'remove',
  EXPIRY = 'expiry',
}
