export type ApiErrorOptions = {
  validationPath?: string;
};

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    options: ApiErrorOptions = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.validationPath = options.validationPath;
  }

  public readonly validationPath: string | undefined;
}

export function formatValidationPath(
  path: readonly PropertyKey[],
): string | undefined {
  const formattedPath = path.reduce<string>((formatted, segment) => {
    if (typeof segment === 'number') {
      return `${formatted}[${segment}]`;
    }

    const separator = formatted ? '.' : '';
    return `${formatted}${separator}${String(segment)}`;
  }, '');

  return formattedPath.slice(0, 200) || undefined;
}
