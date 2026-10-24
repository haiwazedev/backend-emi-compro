import 'dotenv/config';

const MAX_BATCH_SIZE = 100;
const MAX_QUEUE_SIZE = 10_000;
const FLUSH_INTERVAL_MS = 1_000;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

export type OpenObserveSettings = {
  endpoint: string;
  authorization: string;
};

export class OpenObserveTransport {
  private readonly settings: OpenObserveSettings | undefined;
  private readonly queue: Record<string, unknown>[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private inFlight: Promise<void> | undefined;
  private isClosed = false;
  private closeDeadline: number | undefined;
  private droppedSinceWarning = 0;
  private lastOverflowWarning = 0;

  constructor(
    settings: OpenObserveSettings | undefined = readOpenObserveSettings(),
  ) {
    this.settings = settings;

    if (settings) {
      this.timer = setInterval(() => {
        void this.flushOne();
      }, FLUSH_INTERVAL_MS);
      this.timer.unref();
    }
  }

  write(message: string): void {
    if (!this.settings || this.isClosed) {
      return;
    }

    let record: Record<string, unknown>;

    try {
      record = JSON.parse(message) as Record<string, unknown>;
    } catch {
      writeDiagnostic('OpenObserve transport received an invalid log record.');
      return;
    }

    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.droppedSinceWarning += 1;
      this.warnAboutQueueOverflow();
      return;
    }

    this.queue.push(record);

    if (this.queue.length >= MAX_BATCH_SIZE) {
      void this.flushOne();
    }
  }

  async close(timeoutMs = 5_000): Promise<void> {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    const deadline = Date.now() + timeoutMs;
    this.closeDeadline = deadline;

    while (this.queue.length > 0 || this.inFlight) {
      const remainingMs = deadline - Date.now();

      if (remainingMs <= 0) {
        break;
      }

      const pending = this.inFlight ?? this.flushOne();
      const completed = await waitForCompletion(pending, remainingMs);

      if (!completed) {
        break;
      }
    }

    if (this.queue.length > 0) {
      const droppedCount = this.queue.length;
      this.queue.length = 0;
      writeDiagnostic(
        `OpenObserve shutdown flush timed out; dropped ${droppedCount} queued log records.`,
      );
    }
  }

  private flushOne(): Promise<void> {
    if (!this.settings || this.queue.length === 0) {
      return Promise.resolve();
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    const batch = this.queue.splice(0, MAX_BATCH_SIZE);
    const operation = this.sendBatch(batch).finally(() => {
      if (this.inFlight === operation) {
        this.inFlight = undefined;
      }
    });

    this.inFlight = operation;
    return operation;
  }

  private async sendBatch(batch: Record<string, unknown>[]): Promise<void> {
    const settings = this.settings;

    if (!settings) {
      return;
    }

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(settings.endpoint, {
          method: 'POST',
          headers: {
            Authorization: settings.authorization,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.ok) {
          const failedCount = await getFailedRecordCount(response);

          if (failedCount > 0) {
            writeDiagnostic(
              `OpenObserve rejected ${failedCount} of ${batch.length} log records in a successful response.`,
            );
          }

          return;
        }

        if (
          !isRetryableStatus(response.status) ||
          attempt === MAX_RETRY_ATTEMPTS
        ) {
          writeDiagnostic(
            `OpenObserve ingestion returned HTTP ${response.status}; dropped ${batch.length} log records.`,
          );
          return;
        }
      } catch (error) {
        if (attempt === MAX_RETRY_ATTEMPTS) {
          const errorName =
            error instanceof Error ? error.name : 'UnknownError';
          writeDiagnostic(
            `OpenObserve ingestion failed after ${attempt} attempts (${errorName}); dropped ${batch.length} log records.`,
          );
          return;
        }
      }

      const retryDelayMs = RETRY_DELAY_MS * 2 ** (attempt - 1);

      if (
        this.closeDeadline !== undefined &&
        Date.now() + retryDelayMs >= this.closeDeadline
      ) {
        writeDiagnostic(
          `OpenObserve shutdown deadline reached; dropped ${batch.length} log records.`,
        );
        return;
      }

      await delay(retryDelayMs);
    }
  }

  private warnAboutQueueOverflow(): void {
    const now = Date.now();

    if (now - this.lastOverflowWarning < 60_000) {
      return;
    }

    this.lastOverflowWarning = now;
    writeDiagnostic(
      `OpenObserve log queue is full; dropped ${this.droppedSinceWarning} log records.`,
    );
    this.droppedSinceWarning = 0;
  }
}

function readOpenObserveSettings(): OpenObserveSettings | undefined {
  const url = process.env.OPENOBSERVE_URL?.trim();
  const organization = process.env.OPENOBSERVE_ORG?.trim();
  const username = process.env.OPENOBSERVE_USERNAME?.trim();
  const configuredPassword = process.env.OPENOBSERVE_PASSWORD;
  const password = configuredPassword?.trim() ? configuredPassword : undefined;
  const stream = process.env.OPENOBSERVE_STREAM?.trim() || 'pln_emi_server';
  const anyConfigured = [
    url,
    organization,
    username,
    password,
    process.env.OPENOBSERVE_STREAM?.trim(),
  ].some(Boolean);

  if (!anyConfigured) {
    return undefined;
  }

  const missing = [
    ['OPENOBSERVE_URL', url],
    ['OPENOBSERVE_ORG', organization],
    ['OPENOBSERVE_USERNAME', username],
    ['OPENOBSERVE_PASSWORD', password],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    writeDiagnostic(
      `OpenObserve logging is disabled because configuration is incomplete: ${missing.join(', ')}.`,
    );
    return undefined;
  }

  let endpoint: string;

  try {
    const baseUrl = new URL(url!);

    if (
      !['http:', 'https:'].includes(baseUrl.protocol) ||
      baseUrl.username ||
      baseUrl.password ||
      baseUrl.search ||
      baseUrl.hash
    ) {
      throw new Error();
    }

    endpoint = new URL(
      `/api/${encodeURIComponent(organization!)}/${encodeURIComponent(stream)}/_json`,
      baseUrl,
    ).toString();
  } catch {
    writeDiagnostic(
      'OpenObserve logging is disabled because OPENOBSERVE_URL must be a valid HTTP or HTTPS base URL without credentials, query, or fragment.',
    );
    return undefined;
  }

  return {
    endpoint,
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  };
}

async function getFailedRecordCount(response: Response): Promise<number> {
  try {
    const result = (await response.json()) as {
      status?: Array<{ failed?: number }>;
    };

    return (
      result.status?.reduce((count, item) => count + (item.failed ?? 0), 0) ?? 0
    );
  } catch {
    return 0;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function waitForCompletion(
  promise: Promise<void>,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);

    promise.then(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

function writeDiagnostic(message: string): void {
  process.stderr.write(`${message}\n`);
}
