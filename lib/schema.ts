import { z } from 'zod';

// Shared by the form (client), API routes and CLI, so keep it free of Node imports.

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export const MAX_USERS = 10_000;
export const MAX_STAGE_SECONDS = 3600;
export const MAX_STAGES = 20;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const stageSchema = z.object({
  users: z.coerce.number().int('users must be a whole number').min(1).max(MAX_USERS),
  duration: z.coerce.number().int('duration must be a whole number').min(1).max(MAX_STAGE_SECONDS),
});

export const configSchema = z.object({
  url: z.string().trim().refine(isHttpUrl, 'Enter a full URL starting with http:// or https://'),
  method: z.string().default('GET').transform((m) => m.toUpperCase()).pipe(z.enum(METHODS)),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().default(''),
  stages: z.array(stageSchema).min(1, 'Add at least one stage').max(MAX_STAGES),
  rampUp: z.coerce.number().min(0).max(MAX_STAGE_SECONDS).default(0),
  thinkTime: z.coerce.number().min(0).max(60_000).default(0),
  timeout: z.coerce.number().min(100).max(120_000).default(10_000),
  slaP95: z.coerce.number().min(1).max(600_000).default(1000),
  slaErrorRate: z.coerce.number().min(0).max(100).default(1),
});

export type ConfigInput = z.input<typeof configSchema>;
export type TestConfig = z.output<typeof configSchema>;
export type Stage = z.output<typeof stageSchema>;
export type Method = (typeof METHODS)[number];

/** Parse and fill defaults. Throws an Error with one readable message. */
export function parseConfig(input: unknown): TestConfig {
  const result = configSchema.safeParse(input);
  if (!result.success) throw new Error(formatIssue(result.error));
  return result.data;
}

export function formatIssue(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return 'Invalid config';
  const where = issue.path
    .map((p) => (typeof p === 'number' ? `#${p + 1}` : String(p)))
    .join(' ');
  return where ? `${where}: ${issue.message}` : issue.message;
}
