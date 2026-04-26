import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { QUEUE_PROCESS_DOCUMENT } from './queue.constants';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private client?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.getOrThrow<string>('RABBITMQ_URL');
    this.client = await amqp.connect(url);
    this.channel = await this.client.createChannel();
    await this.channel.assertQueue(QUEUE_PROCESS_DOCUMENT, { durable: true });
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => undefined);
    await this.client?.close().catch(() => undefined);
  }

  enqueueProcessDocument(documentId: string) {
    if (!this.channel) throw new Error('Queue channel is not initialized');
    const payload = Buffer.from(JSON.stringify({ documentId }));
    this.channel.sendToQueue(QUEUE_PROCESS_DOCUMENT, payload, {
      persistent: true,
      contentType: 'application/json',
    });
  }
}
