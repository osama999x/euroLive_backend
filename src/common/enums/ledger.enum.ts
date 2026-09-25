export enum LedgerDirection {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum LedgerType {
  ADMIN_ADJUST = 'admin_adjust',
  RESELLER_TRANSFER_IN = 'reseller_transfer_in',
  RESELLER_TRANSFER_OUT = 'reseller_transfer_out',
  ITEM_ASSIGN = 'item_assign',
  SALARY_RELEASE = 'salary_release',
  AGENCY_SHARE = 'agency_share',
  FRAUD_CORRECTION = 'fraud_correction',
  SALARY_CORRECTION = 'salary_correction',
}

export enum ActorType {
  STAFF = 'staff',
  RESELLER = 'reseller',
  AGENCY = 'agency',
  USER = 'user',
  HOST = 'host',
  SYSTEM = 'system',
}
