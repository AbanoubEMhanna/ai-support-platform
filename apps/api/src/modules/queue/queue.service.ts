import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { randomUUID } from 'node:crypto';
import {
  EXCHANGE_PROCESS_DOCUMENT,
  HEADER_ATTEMPT,
  HEADER_CORRELATION_ID,
  QUEUE_PROCESS_DOCUMENT,
  assertProcessDocumentTopology,
} from '@ai-support-platform/shared';

const PUBLISH_CONFIRM_TIMEOUT_MS = 5_000;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  private connection?: amqp.ChannelModel;
  private channel?: amqp.ConfirmChannel;
  private reconnecting = false;
  private shuttingDown = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
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

    this.channel = await this.connection.createConfirmChannel();
    this.channel.on('error', (err) =>
      this.logger.warn(`rabbitmq channel error: ${err.message ?? err}`),
    );

    await assertProcessDocumentTopology(this.channel);
    this.logger.log('rabbitmq publisher ready');
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

  async enqueueProcessDocument(
    documentId: string,
    options: { correlationId?: string } = {},
  ) {
    const channel = this.channel;
    if (!channel) {
      throw new Error('Queue channel is not initialized');
    }

    const correlationId = options.correlationId ?? randomUUID();
    const payload = Buffer.from(
      JSON.stringify({ documentId, correlationId }),
    );

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('rabbitmq publish confirm timeout'));
      }, PUBLISH_CONFIRM_TIMEOUT_MS);

      const ok = channel.publish(
        EXCHANGE_PROCESS_DOCUMENT,
        QUEUE_PROCESS_DOCUMENT,
        payload,
        {
          persistent: true,
          contentType: 'application/json',
          messageId: correlationId,
          headers: {
            [HEADER_ATTEMPT]: 1,
            [HEADER_CORRELATION_ID]: correlationId,
          },
        },
        (err) => {
          clearTimeout(timer);
          if (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          } else {
            resolve();
          }
        },
      );

      if (!ok) {
        // Backpressure: wait for drain, then resolve via the confirm callback above.
        channel.once('drain', () => undefined);
      }
    });
  }
}
