import * as argon2 from 'argon2';
import { ApiError } from '../../shared/errors/api-error.js';
import { AuthRepository } from './auth.repository.js';
import { hashPassword } from './password.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import type { PublicUser } from './auth.types.js';

export type AuthResult = {
  userId: number;
  user: PublicUser;
};

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async register({
    name,
    email,
    password,
  }: RegisterInput): Promise<AuthResult> {
    if (await this.repository.findByEmail(email)) {
      throw new ApiError(409, 'Email is already registered.');
    }

    const passwordHash = await hashPassword(password);

    let user;

    try {
      user = await this.repository.createUser({
        name,
        email,
        password: passwordHash,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiError(409, 'Email is already registered.');
      }

      throw error;
    }

    return this.createAuthResult(user.id, user);
  }

  async login({ email, password }: LoginInput): Promise<AuthResult> {
    const user = await this.repository.findByEmail(email);
    const passwordMatches =
      user !== null && (await argon2.verify(user.password, password));

    if (!user || !passwordMatches) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    await this.repository.updateLastSignedIn(user.id);

    return this.createAuthResult(user.id, user);
  }

  async getAuthenticatedUser(userId: number): Promise<PublicUser> {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new ApiError(401, 'Authentication is required.');
    }

    return toPublicUser(user);
  }

  private createAuthResult(
    userId: number,
    user: { name: string; email: string },
  ): AuthResult {
    return {
      userId,
      user: toPublicUser(user),
    };
  }
}

function toPublicUser(user: { name: string; email: string }): PublicUser {
  return { name: user.name, email: user.email };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
