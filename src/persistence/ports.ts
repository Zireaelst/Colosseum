import type { KeyPairSigner } from "@solana/kit";

import type {
  CreateDelegationInput,
  CreateTaskInput,
  PaymentRequestRecord,
  ReservePurchaseInput,
  ReservePurchaseResult,
  TaskSnapshot,
} from "../ledger/ledger";
import type { PublicTaskAccount } from "../solana/task-accounts";
import type { TaskHistoryEntry } from "../ui/task-history";

export interface LedgerStore {
  createTask(input: CreateTaskInput): Promise<void>;
  createDelegation(input: CreateDelegationInput): Promise<void>;
  cancelDelegation(delegationId: string, now: number): Promise<void>;
  markSettlementPending(paymentRequestId: string, now: number): Promise<void>;
  recordPendingSignature(
    paymentRequestId: string,
    transactionSignature: string,
    now: number,
  ): Promise<void>;
  failPayment(
    paymentRequestId: string,
    failureCode: string,
    now: number,
  ): Promise<void>;
  confirmSettlement(
    paymentRequestId: string,
    transactionSignature: string,
    now: number,
  ): Promise<void>;
  paymentRequest(paymentRequestId: string): Promise<PaymentRequestRecord>;
  taskSnapshot(taskId: string, now: number): Promise<TaskSnapshot>;
  availableAmount(delegationId: string, now: number): Promise<bigint>;
  reservePurchase(input: ReservePurchaseInput): Promise<ReservePurchaseResult>;
}

export interface TaskAccountRepository {
  listForOwner(ownerWallet: string, offset?: number): TaskHistoryEntry[] | Promise<TaskHistoryEntry[]>;
  create(ownerWallet: string): Promise<PublicTaskAccount>;
  signer(taskId: string): Promise<KeyPairSigner>;
  task(taskId: string): Promise<PublicTaskAccount>;
  markFunded(
    taskId: string,
    fundingSignature: string,
  ): Promise<PublicTaskAccount>;
}
