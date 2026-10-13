import type { Ledger } from "../ledger/ledger";

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

export function initializeTaskAuthority(
  ledger: Ledger,
  input: { taskId: string; ownerWallet: string; now?: number },
): TaskRuntimeIds {
  const now = input.now ?? Date.now();
  const ids = runtimeIds(input.taskId);
  ledger.createTask({
    id: input.taskId,
    ownerWallet: input.ownerWallet,
    allocation: 10_000_000n,
    expiresAt: now + 60 * 60_000,
  });
  ledger.createDelegation({
    id: ids.manager,
    taskId: input.taskId,
    parentId: null,
    allocation: 10_000_000n,
    expiresAt: now + 60 * 60_000,
    services: ["research-api", "analysis-api"],
    now,
  });
  ledger.createDelegation({
    id: ids.research,
    taskId: input.taskId,
    parentId: ids.manager,
    allocation: 4_000_000n,
    expiresAt: now + 45 * 60_000,
    services: ["research-api"],
    now,
  });
  ledger.createDelegation({
    id: ids.analysis,
    taskId: input.taskId,
    parentId: ids.manager,
    allocation: 3_000_000n,
    expiresAt: now + 45 * 60_000,
    services: ["analysis-api"],
    now,
  });
  return ids;
}
