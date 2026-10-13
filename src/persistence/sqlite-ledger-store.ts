import {
  Ledger,
  type CreateDelegationInput,
  type CreateTaskInput,
  type ReservePurchaseInput,
} from "../ledger/ledger";
import type { LedgerStore } from "./ports";

export class SqliteLedgerStore implements LedgerStore {
  private readonly ledger: Ledger;

  constructor(path = ":memory:") {
    this.ledger = path === ":memory:" ? Ledger.memory() : Ledger.open(path);
  }

  close(): void {
    this.ledger.close();
  }

  async createTask(input: CreateTaskInput) {
    this.ledger.createTask(input);
  }

  async createDelegation(input: CreateDelegationInput) {
    this.ledger.createDelegation(input);
  }

  async cancelDelegation(delegationId: string, now: number) {
    this.ledger.cancelDelegation(delegationId, now);
  }

  async markSettlementPending(paymentRequestId: string, now: number) {
    this.ledger.markSettlementPending(paymentRequestId, now);
  }

  async recordPendingSignature(
    paymentRequestId: string,
    transactionSignature: string,
    now: number,
  ) {
    this.ledger.recordPendingSignature(
      paymentRequestId,
      transactionSignature,
      now,
    );
  }

  async failPayment(paymentRequestId: string, failureCode: string, now: number) {
    this.ledger.failPayment(paymentRequestId, failureCode, now);
  }

  async confirmSettlement(
    paymentRequestId: string,
    transactionSignature: string,
    now: number,
  ) {
    this.ledger.confirmSettlement(paymentRequestId, transactionSignature, now);
  }

  async paymentRequest(paymentRequestId: string) {
    return this.ledger.paymentRequest(paymentRequestId);
  }

  async taskSnapshot(taskId: string, now: number) {
    return this.ledger.taskSnapshot(taskId, now);
  }

  async availableAmount(delegationId: string, now: number) {
    return this.ledger.availableAmount(delegationId, now);
  }

  async reservePurchase(input: ReservePurchaseInput) {
    return this.ledger.reservePurchase(input);
  }
}
