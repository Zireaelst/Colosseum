import type { Ledger } from "../ledger/ledger";
import {
  RESEARCH_ALLOCATION,
  TASK_ALLOCATION,
  type TaskMandate,
} from "./task-mandate";

export interface TaskRuntimeIds {
  manager: string;
  research: string;
  analysis: string;
}

export function runtimeIds(taskId: string): TaskRuntimeIds {
  return {
    manager: `${taskId}:manager`,
    research: `${taskId}:research`,
    analysis: `${taskId}:analysis`,
  };
}

interface AtomicAuthorityStore {
  initializeTaskAuthority(input: {
    taskId: string;
    ownerWallet: string;
    allocation: bigint;
    expiresAt: number;
    purpose: string;
    serviceId: string;
    resourceId: string;
    maxAmount: bigint;
    managerId: string;
    researchId: string;
    analysisId: string;
    specialistExpiresAt: number;
    researchAllocation: bigint;
    analysisAllocation: bigint;
  }): Promise<void>;
}

export async function initializeTaskAuthority(
  ledger: Ledger | AtomicAuthorityStore,
  input: {
    taskId: string;
    ownerWallet: string;
    mandate: TaskMandate;
    now?: number;
  },
): Promise<TaskRuntimeIds> {
  const now = input.now ?? Date.now();
  const expiresAt = now + input.mandate.durationMinutes * 60_000;
  const specialistExpiresAt = Math.min(expiresAt, now + 45 * 60_000);
  const ids = runtimeIds(input.taskId);
  if ("initializeTaskAuthority" in ledger) {
    await ledger.initializeTaskAuthority({
      taskId: input.taskId,
      ownerWallet: input.ownerWallet,
      allocation: TASK_ALLOCATION,
      expiresAt,
      purpose: input.mandate.purpose,
      serviceId: input.mandate.serviceId,
      resourceId: input.mandate.resourceId,
      maxAmount: input.mandate.maxAmount,
      managerId: ids.manager,
      researchId: ids.research,
      analysisId: ids.analysis,
      specialistExpiresAt,
      researchAllocation: RESEARCH_ALLOCATION,
      analysisAllocation: 3_000_000n,
    });
    return ids;
  }
  ledger.createTask({
    id: input.taskId,
    ownerWallet: input.ownerWallet,
    allocation: TASK_ALLOCATION,
    expiresAt,
    mandate: input.mandate,
  });
  ledger.createDelegation({
    id: ids.manager,
    taskId: input.taskId,
    parentId: null,
    allocation: TASK_ALLOCATION,
    expiresAt,
    services: ["research-api", "analysis-api"],
    now,
  });
  ledger.createDelegation({
    id: ids.research,
    taskId: input.taskId,
    parentId: ids.manager,
    allocation: RESEARCH_ALLOCATION,
    expiresAt: specialistExpiresAt,
    services: ["research-api"],
    now,
  });
  ledger.createDelegation({
    id: ids.analysis,
    taskId: input.taskId,
    parentId: ids.manager,
    allocation: 3_000_000n,
    expiresAt: specialistExpiresAt,
    services: ["analysis-api"],
    now,
  });
  return ids;
}
