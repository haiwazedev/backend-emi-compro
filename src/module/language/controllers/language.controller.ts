import type { Request, Response } from 'express';
import { presentLanguage } from '../presenters/language.presenter.js';
import { LanguageService } from '../services/language.service.js';

export class LanguageController {
  constructor(private readonly service = new LanguageService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const languages = await this.service.listActive();

    res.status(200).json({ languages: languages.map(presentLanguage) });
  };
}
