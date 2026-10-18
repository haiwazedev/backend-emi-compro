import * as argon2 from 'argon2';
import { ApiError } from '../../shared/errors/api-error.js';
import { AuthRepository } from './auth.repository.js';
import type { AuthUser } from './auth.repository.js';
import type { LoginInput } from './auth.schemas.js';
import type { PublicUser } from './auth.types.js';

export type AuthResult = {
  userId: number;
  user: PublicUser;
};

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async login({ email, password }: LoginInput): Promise<AuthResult> {
    const user = await this.repository.findByEmail(email);
    const passwordMatches =
      user !== null && (await argon2.verify(user.password, password));

    if (!user || !passwordMatches) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    // Checked after the password so the response does not reveal which emails exist.
    if (!isActive(user)) {
      throw new ApiError(403, 'Your account is inactive.');
    }

    await this.repository.updateLastSignedIn(user.id);

    return { userId: user.id, user: toPublicUser(user) };
  }

  // Runs on every protected request, so deactivation and role changes apply immediately.
  async getAuthenticatedUser(userId: number): Promise<PublicUser> {
    const user = await this.repository.findById(userId);

    if (!user || !isActive(user)) {
      throw new ApiError(401, 'Authentication is required.');
    }

    return toPublicUser(user);
  }
}

function isActive(user: AuthUser): boolean {
  return user.userRole?.isActive ?? true;
}

function toPublicUser(user: AuthUser): PublicUser {
  const role = user.userRole?.role;

  return {
    name: user.name,
    email: user.email,
    role: role ? { id: role.id, name: role.name } : null,
    permissions:
      role?.rolePermissions.map(
        (rolePermission) => rolePermission.permission.name,
      ) ?? [],
  };
}
