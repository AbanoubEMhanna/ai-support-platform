export const QUEUE_PROCESS_DOCUMENT = 'process_document';
export const QUEUE_PROCESS_DOCUMENT_RETRY = 'process_document.retry';
export const QUEUE_PROCESS_DOCUMENT_DLQ = 'process_document.dlq';

export const EXCHANGE_PROCESS_DOCUMENT = 'process_document.exchange';
export const EXCHANGE_PROCESS_DOCUMENT_DLX = 'process_document.dlx';
export const EXCHANGE_PROCESS_DOCUMENT_RETRY = 'process_document.retry.exchange';

export const HEADER_ATTEMPT = 'x-attempt';
export const HEADER_CORRELATION_ID = 'x-correlation-id';

export const MAX_ATTEMPTS = 5;

export function retryDelayMs(attempt: number) {
  const base = 2_000;
  return Math.min(base * Math.pow(2, attempt - 1), 60_000);
}

export type QueueChannelLike = {
  assertExchange: (
    exchange: string,
    type: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  assertQueue: (
    queue: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  bindQueue: (
    queue: string,
    source: string,
    pattern: string,
  ) => Promise<unknown>;
};

export async function assertProcessDocumentTopology(
  channel: QueueChannelLike,
) {
  await channel.assertExchange(EXCHANGE_PROCESS_DOCUMENT, 'direct', {
    durable: true,
  });
  await channel.assertExchange(EXCHANGE_PROCESS_DOCUMENT_DLX, 'direct', {
    durable: true,
  });
  await channel.assertExchange(EXCHANGE_PROCESS_DOCUMENT_RETRY, 'direct', {
    durable: true,
  });

  await channel.assertQueue(QUEUE_PROCESS_DOCUMENT, {
    durable: true,
    deadLetterExchange: EXCHANGE_PROCESS_DOCUMENT_DLX,
  });
  await channel.bindQueue(
    QUEUE_PROCESS_DOCUMENT,
    EXCHANGE_PROCESS_DOCUMENT,
    QUEUE_PROCESS_DOCUMENT,
  );

  await channel.assertQueue(QUEUE_PROCESS_DOCUMENT_RETRY, {
    durable: true,
    deadLetterExchange: EXCHANGE_PROCESS_DOCUMENT,
    deadLetterRoutingKey: QUEUE_PROCESS_DOCUMENT,
  });
  await channel.bindQueue(
    QUEUE_PROCESS_DOCUMENT_RETRY,
    EXCHANGE_PROCESS_DOCUMENT_RETRY,
    QUEUE_PROCESS_DOCUMENT_RETRY,
  );

  await channel.assertQueue(QUEUE_PROCESS_DOCUMENT_DLQ, { durable: true });
  await channel.bindQueue(
    QUEUE_PROCESS_DOCUMENT_DLQ,
    EXCHANGE_PROCESS_DOCUMENT_DLX,
    QUEUE_PROCESS_DOCUMENT,
  );
}
