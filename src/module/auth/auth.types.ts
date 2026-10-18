export type Permission = 'write' | 'publish' | 'delete' | 'manage_users';

export type PublicUser = {
  name: string;
  email: string;
  role: { id: number; name: string } | null;
  // Allowed permission keys; viewing needs none.
  permissions: string[];
};
