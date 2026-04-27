import { z } from 'zod';

const nonEmptyString = z.string().min(1);

const requiredSecret = z
  .string()
  .min(32, 'Secret must be at least 32 characters');

export const apiEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    WEB_ORIGIN: z.string().url().default('http://localhost:3001'),
    DATABASE_URL: nonEmptyString,
    REDIS_URL: nonEmptyString,
    RABBITMQ_URL: nonEmptyString,
    JWT_ACCESS_SECRET: requiredSecret,
    JWT_REFRESH_SECRET: requiredSecret,
    OPENAI_API_KEY: z.string().optional(),
    OLLAMA_BASE_URL: z.string().url().optional(),
    LM_STUDIO_BASE_URL: z.string().url().optional(),
    LM_STUDIO_API_KEY: z.string().optional(),
    ORG_STORAGE_QUOTA_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(500 * 1024 * 1024),
    PDF_MAX_TEXT_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(5_000_000),
  })
  .refine(
    (env) =>
      env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET,
    { message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ' },
  );

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const workerEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: nonEmptyString,
  RABBITMQ_URL: nonEmptyString,
  OPENAI_API_KEY: z.string().optional(),
  PDF_MAX_TEXT_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5_000_000),
  PDF_MAX_PAGES: z.coerce.number().int().positive().default(200),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function validateApiEnv(raw: NodeJS.ProcessEnv): ApiEnv {
  const parsed = apiEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid API environment:\n${issues}`);
  }
  return parsed.data;
}

export function validateWorkerEnv(raw: NodeJS.ProcessEnv): WorkerEnv {
  const parsed = workerEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid worker environment:\n${issues}`);
  }
  return parsed.data;
}
