import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { FaqRepository } from '../repositories/faq.repository.js';
import type {
  CreateFaqInput,
  FaqListQuery,
  ReorderFaqsInput,
  UpdateFaqInput,
} from '../schemas/faq.schema.js';

export class FaqService {
  constructor(private readonly repository = new FaqRepository()) {}

  list(query: FaqListQuery) {
    return this.repository.findMany(query);
  }

  async getById(id: number) {
    const faq = await this.repository.findById(id);

    if (!faq) {
      throw new ApiError(404, 'FAQ was not found.');
    }

    return faq;
  }

  async reorder(input: ReorderFaqsInput) {
    const faqs = await this.repository.reorder(input.faq_ids);

    if (!faqs) {
      throw new ApiError(
        400,
        'faq_ids must contain every existing FAQ ID exactly once.',
      );
    }

    return faqs;
  }

  async create(input: CreateFaqInput, userName: string) {
    return this.repository.create({
      question: input.question,
      answer: input.answer,
      ...(input.status !== undefined ? { status: input.status } : {}),
      createdBy: getAuditName(userName),
    });
  }

  async update(id: number, input: UpdateFaqInput, userName: string) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one FAQ field is required.');
    }

    const data: Prisma.FaqUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy: getAuditName(userName),
    };

    if (input.question !== undefined) data.question = input.question;
    if (input.answer !== undefined) data.answer = input.answer;
    if (input.status !== undefined) data.status = input.status;

    try {
      return await this.repository.update(id, data);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'FAQ was not found.');
      }

      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'FAQ was not found.');
      }

      throw error;
    }
  }
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
