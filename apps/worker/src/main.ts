import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { validateWorkerEnv } from '@ai-support-platform/shared';
import { AppModule } from './app.module';
import { QueueConsumerService } from './queue/queue-consumer.service';

async function bootstrap() {
  validateWorkerEnv(process.env);

  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  const consumer = app.get(QueueConsumerService);
  await consumer.start();
  Logger.log('worker consuming PROCESS_DOCUMENT', 'Bootstrap');

  const shutdown = async (signal: string) => {
    Logger.log(`received ${signal}, shutting down…`, 'Bootstrap');
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      Logger.error(
        err instanceof Error ? err.stack ?? err.message : String(err),
        'Bootstrap',
      );
      process.exit(1);
    }
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  Logger.error(
    err instanceof Error ? err.stack ?? err.message : String(err),
    'Bootstrap',
  );
  process.exit(1);
});
