import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { sendMail } from '../../../shared/mail/mailer.js';
import { buildInviteMail } from '../../auth/auth.mails.js';
import { buildActivationUrl, issueUserToken } from '../../auth/user-token.js';
import { RoleRepository } from '../../role/repositories/role.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListQuery,
} from '../schemas/user.schema.js';

export class UserService {
  constructor(
    private readonly repository = new UserRepository(),
    private readonly roleRepository = new RoleRepository(),
    private readonly activityLogService = new ActivityLogService(),
  ) {}

  async list(query: UserListQuery) {
    const [users, totalItems] = await Promise.all([
      this.repository.findMany(query),
      this.repository.count(query),
    ]);

    return {
      users,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    };
  }

  async getById(id: number) {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new ApiError(404, 'User was not found.');
    }

    return user;
  }

  async create(input: CreateUserInput, user: AuthenticatedUser) {
    const { role_id, ...data } = input;

    await this.assertEmailAvailable(data.email);
    await this.assertRoleExists(role_id);

    try {
      const created = await this.repository.create(
        data,
        { roleId: role_id, isActive: false },
        user.name,
      );
      await this.activityLogService.log(
        user,
        'menambahkan pengguna',
        created.name,
      );
      await sendInvite(created);
      return created;
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ApiError(409, 'Email is already registered.');
      }

      throw error;
    }
  }

  async resendInvite(id: number, user: AuthenticatedUser): Promise<void> {
    const target = await this.getById(id);

    if (target.password !== null) {
      throw new ApiError(409, 'User has already activated their account.');
    }

    await sendInvite(target);
    await this.activityLogService.log(
      user,
      'mengirim ulang undangan pengguna',
      target.name,
    );
  }

  async update(id: number, input: UpdateUserInput, user: AuthenticatedUser) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one user field is required.');
    }

    const { role_id, is_active, ...data } = input;

    if (data.email) {
      await this.assertEmailAvailable(data.email, id);
    }

    await this.assertRoleExists(role_id);

    try {
      const updated = await this.repository.update(
        id,
        data,
        {
          ...(role_id !== undefined && { roleId: role_id }),
          ...(is_active !== undefined && { isActive: is_active }),
        },
        user.name,
      );
      await this.activityLogService.log(
        user,
        'memperbarui pengguna',
        updated.name,
      );
      return updated;
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ApiError(409, 'Email is already registered.');
      }

      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'User was not found.');
      }

      throw error;
    }
  }

  async delete(id: number, user: AuthenticatedUser): Promise<void> {
    if (id === user.id) {
      throw new ApiError(400, 'You cannot delete your own account.');
    }

    const target = await this.getById(id);

    try {
      await this.repository.delete(id);
      await this.activityLogService.log(
        user,
        'menghapus pengguna',
        target.name,
      );
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'User was not found.');
      }

      throw error;
    }
  }

  private async assertEmailAvailable(email: string, userId?: number) {
    const existing = await this.repository.findByEmail(email);

    if (existing && existing.id !== userId) {
      throw new ApiError(409, 'Email is already registered.');
    }
  }

  private async assertRoleExists(roleId: number | null | undefined) {
    if (roleId && !(await this.roleRepository.findById(roleId))) {
      throw new ApiError(400, 'Role was not found.');
    }
  }
}

// The user is already saved, so a mail failure is reported but not rolled back;
// the admin can resend the invite.
async function sendInvite(target: { id: number; name: string; email: string }) {
  const token = await issueUserToken(target.id, 'INVITE');

  try {
    await sendMail(buildInviteMail(target, buildActivationUrl(token)));
  } catch (error) {
    console.error('Failed to send invite email.', error);
    throw new ApiError(
      502,
      'The invite email could not be sent. Try resending the invite.',
    );
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
