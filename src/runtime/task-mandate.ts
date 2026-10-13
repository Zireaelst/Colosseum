import { z } from "zod";

export const TASK_SERVICE_ID = "research-api" as const;
export const TASK_RESOURCE_ID = "research-brief" as const;
export const TASK_ALLOCATION = 10_000_000n;
export const RESEARCH_ALLOCATION = 4_000_000n;

const taskMandateInputSchema = z.object({
  purpose: z.string().trim().min(3).max(240),
  serviceId: z.literal(TASK_SERVICE_ID),
  resourceId: z.literal(TASK_RESOURCE_ID),
  maxAmountBaseUnits: z.string().regex(/^[1-9]\d*$/),
  durationMinutes: z.number().int().min(5).max(60),
}).strict();

export interface TaskMandate {
  purpose: string;
  serviceId: typeof TASK_SERVICE_ID;
  resourceId: typeof TASK_RESOURCE_ID;
  maxAmount: bigint;
  durationMinutes: number;
}

export function parseTaskMandate(input: unknown): TaskMandate {
  const parsed = taskMandateInputSchema.parse(input);
  const maxAmount = BigInt(parsed.maxAmountBaseUnits);
  if (maxAmount > RESEARCH_ALLOCATION) {
    throw new Error("Per-purchase maximum exceeds research delegation");
  }
  return {
    purpose: parsed.purpose,
    serviceId: parsed.serviceId,
    resourceId: parsed.resourceId,
    maxAmount,
    durationMinutes: parsed.durationMinutes,
  };
}
