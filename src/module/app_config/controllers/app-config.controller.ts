import type { Request, Response } from 'express';
import { AppConfigService } from '../services/app-config.service.js';

export class AppConfigController {
  constructor(private readonly service = new AppConfigService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ app_configs: await this.service.getAll() });
  };
}
