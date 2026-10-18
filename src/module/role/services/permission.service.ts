import { PermissionRepository } from '../repositories/permission.repository.js';

export class PermissionService {
  constructor(private readonly repository = new PermissionRepository()) {}

  list() {
    return this.repository.findMany();
  }
}
