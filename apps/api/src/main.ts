import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { validateApiEnv } from '@ai-support-platform/shared';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http/http-exception.filter';
import { ResponseInterceptor } from './common/http/response.interceptor';

async function bootstrap() {
  const env = validateApiEnv(process.env);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '1mb' });

  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('ai-support-platform API')
    .setDescription(
      'Multi-tenant AI support SaaS API with auth, document ingestion, RAG chat, and ticket escalation.',
    )
    .setVersion('0.0.1')
    .addCookieAuth('access_token')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(env.API_PORT);
  Logger.log(
    `API listening on http://localhost:${env.API_PORT} (env=${env.NODE_ENV})`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  Logger.error(
    err instanceof Error ? err.stack ?? err.message : String(err),
    'Bootstrap',
  );
  process.exit(1);
});
