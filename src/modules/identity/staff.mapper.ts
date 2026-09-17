import { StaffRole } from '../../common/enums';
import { StaffUser } from '../../database/entities';

export function toStaffPublic(staff: StaffUser) {
  const roles = staff.roles?.map((role) => role.slug) ?? [];
  return {
    id: staff.id,
    email: staff.email,
    username: staff.username,
    totpEnabled: staff.totpEnabled,
    status: staff.status,
    roles,
    role: roles.includes(StaffRole.SUPER_ADMIN) ? StaffRole.SUPER_ADMIN : roles[0] ?? null,
    createdAt: staff.createdAt,
  };
}
