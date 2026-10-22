import * as argon2 from 'argon2';
import { ApiError } from '../../shared/errors/api-error.js';
import { AuthRepository } from './auth.repository.js';
import type { AuthUser } from './auth.repository.js';
import { sendMail } from '../../shared/mail/mailer.js';
import { buildResetMail } from './auth.mails.js';
import type { UserTokenPurpose } from '../../generated/prisma/client.js';
import type {
  ActivateInput,
  ForgotPasswordInput,
  LoginInput,
  VerifyTokenInput,
} from './auth.schemas.js';
import type { PublicUser } from './auth.types.js';
import { hashPassword } from './password.js';
import {
  buildActivationUrl,
  findValidUserToken,
  issueUserToken,
} from './user-token.js';

const invalidTokenMessage = 'This link is invalid or has expired.';

export type AuthResult = {
  userId: number;
  user: PublicUser;
};

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async login({ email, password }: LoginInput): Promise<AuthResult> {
    const user = await this.repository.findByEmail(email);
    // Invited users have no password until they activate.
    const passwordMatches =
      user?.password != null && (await argon2.verify(user.password, password));

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

  // Same response whether or not the email exists, so it cannot be used to probe accounts.
  async forgotPassword({ email }: ForgotPasswordInput): Promise<void> {
    const user = await this.repository.findByEmail(email);

    // Invited users have no password to reset; the admin resends their invite.
    if (!user?.password) {
      return;
    }

    const token = await issueUserToken(user.id, 'RESET');

    try {
      await sendMail(buildResetMail(user, buildActivationUrl(token)));
    } catch (error) {
      console.error('Failed to send password reset email.', error);
    }
  }

  // Read-only check so the page can show an expired link before the user types a password.
  async verifyToken({
    token,
  }: VerifyTokenInput): Promise<{ purpose: UserTokenPurpose }> {
    const userToken = await findValidUserToken(token);

    if (!userToken) {
      throw new ApiError(400, invalidTokenMessage);
    }

    return { purpose: userToken.purpose };
  }

  // Invite tokens also activate the account; reset tokens never do, so a
  // deactivated user cannot reactivate themselves.
  async activate({ token, password }: ActivateInput): Promise<void> {
    const userToken = await findValidUserToken(token);
    const isUsed =
      userToken !== null &&
      (await this.repository.setPasswordWithToken(
        userToken.id,
        userToken.userId,
        await hashPassword(password),
        userToken.purpose === 'INVITE',
      ));

    if (!isUsed) {
      throw new ApiError(400, invalidTokenMessage);
    }
  }

  // Runs on every protected request, so deactivation, role and password changes apply immediately.
  async getAuthenticatedUser(
    userId: number,
    authenticatedAt: number | undefined,
  ): Promise<PublicUser> {
    const user = await this.repository.findById(userId);

    if (
      !user ||
      !isActive(user) ||
      signedInBeforePasswordChange(user, authenticatedAt)
    ) {
      throw new ApiError(401, 'Authentication is required.');
    }

    return toPublicUser(user);
  }
}

function isActive(user: AuthUser): boolean {
  return user.userRole?.isActive ?? true;
}

function signedInBeforePasswordChange(
  user: AuthUser,
  authenticatedAt: number | undefined,
): boolean {
  return (
    user.passwordChangedAt !== null &&
    (authenticatedAt ?? 0) < user.passwordChangedAt.getTime()
  );
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
