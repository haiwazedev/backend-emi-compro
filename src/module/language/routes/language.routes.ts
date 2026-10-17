import { Router } from 'express';
import { LanguageController } from '../controllers/language.controller.js';

const controller = new LanguageController();

export const languageRouter = Router();

languageRouter.get('/languages', controller.list);
