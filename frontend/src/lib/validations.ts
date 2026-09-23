import { z } from 'zod';

export const pipelineCreationSchema = z.object({
  name: z.string().min(3, 'Pipeline name must be at least 3 characters'),
  description: z.string().optional(),
  sourceType: z.enum(['postgresql', 'mysql', 'kafka', 's3']),
  targetType: z.enum(['snowflake', 'bigquery', 'redshift', 'kafka']),
  schedule: z.string().min(1, 'Schedule is required'),
});

export type PipelineCreationFormData = z.infer<typeof pipelineCreationSchema>;

export const askAidenPromptSchema = z.object({
  prompt: z.string().min(5, 'Prompt must be at least 5 characters long'),
  category: z.enum(['generate', 'diagnose', 'explain', 'optimize']).default('generate'),
});

export type AskAidenPromptFormData = z.infer<typeof askAidenPromptSchema>;
