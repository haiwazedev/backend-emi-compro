import type { RequestHandler } from 'express';
import { DocumentCommitmentRepository } from '../repositories/document-commitment.repository.js';

const repository = new DocumentCommitmentRepository();

// Mounted on /public/document_commitment: draft PDFs are only served through the admin file route.
export const requirePublishedDocumentFile: RequestHandler = async (
  req,
  res,
  next,
) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  let filename: string;
  try {
    filename = decodeURIComponent(req.path.slice(1));
  } catch {
    res.status(404).end();
    return;
  }

  if (!(await repository.isPublishedFilename(filename))) {
    res.status(404).end();
    return;
  }

  next();
};
