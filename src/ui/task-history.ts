export interface TaskHistoryEntry {
  id: string;
  paymentAddress: string;
  fundingSignature?: string;
}

export const TASK_HISTORY_PAGE_SIZE = 20;
