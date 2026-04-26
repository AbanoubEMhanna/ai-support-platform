import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { QueueConsumerService } from './queue/queue-consumer.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.get(QueueConsumerService).start();
}
bootstrap();
