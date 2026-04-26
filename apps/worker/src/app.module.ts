import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentProcessorService } from './documents/document-processor.service';
import { EmbeddingService } from './embeddings/embedding.service';
import { PrismaService } from './prisma/prisma.service';
import { QueueConsumerService } from './queue/queue-consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      envFilePath: ['.env', '../../.env'],
    }),
  ],
  controllers: [],
  providers: [
    PrismaService,
    EmbeddingService,
    DocumentProcessorService,
    QueueConsumerService,
  ],
})
export class AppModule {}
