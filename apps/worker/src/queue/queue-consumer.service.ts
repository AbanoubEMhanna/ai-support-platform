import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  EXCHANGE_PROCESS_DOCUMENT_RETRY,
  HEADER_ATTEMPT,
  HEADER_CORRELATION_ID,
  MAX_ATTEMPTS,
  QUEUE_PROCESS_DOCUMENT,
  QUEUE_PROCESS_DOCUMENT_RETRY,
  assertProcessDocumentTopology,
  retryDelayMs,
} from '@ai-support-platform/shared';
import { DocumentProcessorService } from '../documents/document-processor.service';

@Injectable()
export class QueueConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueConsumerService.name);

  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;
  private consumerTag?: string;
  private reconnecting = false;
  private shuttingDown = false;

  constructor(
    private readonly config: ConfigService,
    private readonly processor: DocumentProcessorService,
  ) {}

  async start() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag).catch(() => undefined);
    }
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async connect() {
    const url = this.config.getOrThrow<string>('RABBITMQ_URL');
    this.connection = await amqp.connect(url);
    this.connection.on('close', (err) => this.handleConnectionClose(err));
    this.connection.on('error', (err) =>
      this.logger.warn(`rabbitmq connection error: ${err.message ?? err}`),
    );

    this.channel = await this.connection.createChannel();
    this.channel.on('error', (err) =>
      this.logger.warn(`rabbitmq channel error: ${err.message ?? err}`),
    );

    await assertProcessDocumentTopology(this.channel);
    await this.channel.prefetch(4);

    const { consumerTag } = await this.channel.consume(
      QUEUE_PROCESS_DOCUMENT,
      (msg) => {
        if (!msg) return;
        void this.handleMessage(msg);
      },
      { noAck: false },
    );
    this.consumerTag = consumerTag;
    this.logger.log(`consuming queue ${QUEUE_PROCESS_DOCUMENT}`);
  }

  private handleConnectionClose(err?: Error | null) {
    if (this.shuttingDown) return;
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.logger.warn(
      `rabbitmq connection closed${err ? `: ${err.message ?? err}` : ''}; reconnecting…`,
    );
    let attempt = 0;
    const tryConnect = () => {
      attempt++;
      const delay = Math.min(1_000 * 2 ** (attempt - 1), 30_000);
      setTimeout(async () => {
        try {
          await this.connect();
          this.reconnecting = false;
          this.logger.log('rabbitmq reconnected');
        } catch (e) {
          this.logger.warn(
            `rabbitmq reconnect failed (attempt ${attempt}): ${(e as Error)?.message ?? e}`,
          );
          tryConnect();
        }
      }, delay);
    };
    tryConnect();
  }

  private async handleMessage(msg: amqp.ConsumeMessage) {
    const channel = this.channel;
    if (!channel) return;

    const headers = (msg.properties.headers ?? {}) as Record<string, unknown>;
    const attempt = Number(headers[HEADER_ATTEMPT] ?? 1);
    const correlationId =
      (headers[HEADER_CORRELATION_ID] as string | undefined) ??
      msg.properties.messageId ??
      undefined;

    let payload: { documentId?: string; correlationId?: string };
    try {
      payload = JSON.parse(msg.content.toString('utf8'));
    } catch {
      this.logger.warn('drop malformed message');
      channel.ack(msg);
      return;
    }

    const documentId = payload.documentId;
    if (!documentId) {
      this.logger.warn('drop message without documentId');
      channel.ack(msg);
      return;
    }

    try {
      await this.processor.process(documentId, correlationId);
      channel.ack(msg);
    } catch (err) {
      this.logger.error(
        `process failed doc=${documentId} attempt=${attempt} cid=${correlationId ?? '-'}: ${
          (err as Error)?.message ?? err
        }`,
      );

      if (attempt >= MAX_ATTEMPTS) {
        // Send straight to DLQ via the configured DLX.
        channel.nack(msg, false, false);
        return;
      }

      const delay = retryDelayMs(attempt);
      const sent = channel.publish(
        EXCHANGE_PROCESS_DOCUMENT_RETRY,
        QUEUE_PROCESS_DOCUMENT_RETRY,
        msg.content,
        {
          persistent: true,
          contentType: msg.properties.contentType,
          messageId: msg.properties.messageId,
          expiration: String(delay),
          headers: {
            ...headers,
            [HEADER_ATTEMPT]: attempt + 1,
          },
        },
      );
      if (!sent) {
        this.logger.warn('retry publish backpressured; nack with requeue');
        channel.nack(msg, false, true);
        return;
      }
      channel.ack(msg);
    }
  }
}
