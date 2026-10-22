import type { Prisma } from '../../../generated/prisma/client.js';
import type { userInclude } from '../repositories/user.repository.js';

export type UserWithRole = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;

// Never includes the password hash.
export function presentUser(user: UserWithRole) {
  const role = user.userRole?.role;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role ? { id: role.id, name: role.name } : null,
    is_active: user.userRole?.isActive ?? true,
    // True until the user accepts the invite and sets a password.
    is_pending: user.password === null,
    last_signed_in: user.userRole?.lastSignedIn?.toISOString() ?? null,
  };
}
