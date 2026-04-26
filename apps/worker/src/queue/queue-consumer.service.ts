import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { DocumentProcessorService } from '../documents/document-processor.service';
import { QUEUE_PROCESS_DOCUMENT } from './queue.constants';

@Injectable()
export class QueueConsumerService {
  private readonly logger = new Logger(QueueConsumerService.name);
  private client?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  constructor(
    private readonly config: ConfigService,
    private readonly processor: DocumentProcessorService,
  ) {}

  async start() {
    const url = this.config.getOrThrow<string>('RABBITMQ_URL');
    this.client = await amqp.connect(url);
    this.channel = await this.client.createChannel();
    await this.channel.assertQueue(QUEUE_PROCESS_DOCUMENT, { durable: true });
    await this.channel.prefetch(1);

    this.logger.log(`Consuming queue ${QUEUE_PROCESS_DOCUMENT}`);

    await this.channel.consume(
      QUEUE_PROCESS_DOCUMENT,
      async (msg) => {
        if (!msg) return;
        await this.handleMessage(msg);
      },
      { noAck: false },
    );
  }

  private async handleMessage(msg: amqp.ConsumeMessage) {
    const channel = this.channel;
    if (!channel) return;

    let payload: any;
    try {
      payload = JSON.parse(msg.content.toString('utf8'));
    } catch {
      channel.ack(msg);
      return;
    }

    const documentId = payload?.documentId as string | undefined;
    if (!documentId) {
      channel.ack(msg);
      return;
    }

    const attempt = Number(msg.properties.headers?.['x-attempt'] ?? 1);

    try {
      await this.processor.process(documentId);
      channel.ack(msg);
    } catch (err) {
      this.logger.error(
        `Failed processing documentId=${documentId} attempt=${attempt}`,
        (err as any)?.stack ?? String(err),
      );

      channel.ack(msg);

      if (attempt >= 3) return;

      const delayMs = 2000 * attempt;
      setTimeout(() => {
        channel.sendToQueue(
          QUEUE_PROCESS_DOCUMENT,
          Buffer.from(JSON.stringify({ documentId })),
          {
            persistent: true,
            contentType: 'application/json',
            headers: { 'x-attempt': attempt + 1 },
          },
        );
      }, delayMs).unref?.();
    }
  }
}

