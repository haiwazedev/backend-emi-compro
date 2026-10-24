import { AppConfigRepository } from '../repositories/app-config.repository.js';

export class AppConfigService {
  constructor(private readonly repository = new AppConfigRepository()) {}

  async getAll(): Promise<Record<string, string>> {
    const configs = await this.repository.findAll();
    return Object.fromEntries(configs.map(({ key, value }) => [key, value]));
  }

  // A missing or non-positive-integer value means no limit.
  async getMaxUsers(): Promise<number | null> {
    const max = Number(await this.repository.findValue('max_users'));
    return Number.isInteger(max) && max > 0 ? max : null;
  }
}
