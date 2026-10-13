import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PaymentRequestRecord,
  ReservePurchaseInput,
  ReservePurchaseResult,
  TaskSnapshot,
} from "../../ledger/ledger";

type RpcClient = Pick<SupabaseClient, "rpc" | "from">;

export class StorageUnavailableError extends Error {
  readonly code = "STORAGE_UNAVAILABLE";

  constructor() {
    super("Durable storage is temporarily unavailable");
    this.name = "StorageUnavailableError";
  }
}

function units(value: unknown): bigint {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new StorageUnavailableError();
  }
  try {
    return BigInt(value);
  } catch {
    throw new StorageUnavailableError();
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new StorageUnavailableError();
  }
  return value as Record<string, unknown>;
}

export class SupabaseLedgerStore {
  constructor(private readonly client: RpcClient) {}

  private async rpc(name: string, parameters: Record<string, unknown>) {
    const { data, error } = await this.client.rpc(name, parameters);
    if (error) throw new StorageUnavailableError();
    return data;
  }

  async initializeTaskAuthority(input: {
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
  }): Promise<void> {
    await this.rpc("initialize_task_authority", {
      p_task_id: input.taskId,
      p_owner_wallet: input.ownerWallet,
      p_allocation_units: input.allocation.toString(),
      p_expires_at_ms: input.expiresAt,
      p_purpose: input.purpose,
      p_service_id: input.serviceId,
      p_resource_id: input.resourceId,
      p_max_amount_units: input.maxAmount.toString(),
      p_manager_id: input.managerId,
      p_research_id: input.researchId,
      p_analysis_id: input.analysisId,
      p_specialist_expires_at_ms: input.specialistExpiresAt,
      p_research_allocation_units: input.researchAllocation.toString(),
      p_analysis_allocation_units: input.analysisAllocation.toString(),
    });
  }

  async reservePurchase(input: ReservePurchaseInput): Promise<ReservePurchaseResult> {
    const raw = object(await this.rpc("reserve_purchase", {
      p_delegation_id: input.delegationId,
      p_purchase_ref: input.purchaseRef,
      p_service_id: input.serviceId,
      p_resource_id: input.resourceId,
      p_amount_units: input.amount.toString(),
      p_now_ms: input.now,
    }));
    const base = {
      paymentRequestId: String(raw.paymentRequestId),
      replayed: raw.replayed === true,
      amount: units(raw.amount),
      availableAfter: units(raw.availableAfter),
    };
    if (raw.ok === true) {
      return {
        ok: true,
        ...base,
        state: raw.state as "reserved" | "settlement_pending" | "settled",
      };
    }
    return {
      ok: false,
      ...base,
      state: raw.state as "rejected" | "failed",
      code: String(raw.code) as Extract<ReservePurchaseResult, { ok: false }>["code"],
    };
  }

  async availableAmount(delegationId: string, now: number): Promise<bigint> {
    return units(await this.rpc("available_amount", {
      p_delegation_id: delegationId,
      p_now_ms: now,
    }));
  }

  async cancelDelegation(delegationId: string, now: number): Promise<void> {
    await this.rpc("cancel_delegation", {
      p_delegation_id: delegationId,
      p_now_ms: now,
    });
  }

  async markSettlementPending(paymentRequestId: string, now: number): Promise<void> {
    await this.rpc("mark_settlement_pending", {
      p_payment_request_id: paymentRequestId,
      p_now_ms: now,
    });
  }

  async recordPendingSignature(
    paymentRequestId: string,
    transactionSignature: string,
    now: number,
  ): Promise<void> {
    await this.rpc("record_pending_signature", {
      p_payment_request_id: paymentRequestId,
      p_transaction_signature: transactionSignature,
      p_now_ms: now,
    });
  }

  async failPayment(paymentRequestId: string, failureCode: string, now: number) {
    await this.rpc("fail_payment", {
      p_payment_request_id: paymentRequestId,
      p_failure_code: failureCode,
      p_now_ms: now,
    });
  }

  async confirmSettlement(
    paymentRequestId: string,
    transactionSignature: string,
    now: number,
  ) {
    await this.rpc("confirm_settlement", {
      p_payment_request_id: paymentRequestId,
      p_transaction_signature: transactionSignature,
      p_now_ms: now,
    });
  }

  async paymentRequest(paymentRequestId: string): Promise<PaymentRequestRecord> {
    const { data: payment, error } = await this.client.from("payment_requests")
      .select("id,state,amount_units,pending_transaction_signature")
      .eq("id", paymentRequestId).maybeSingle();
    if (error || !payment) throw new StorageUnavailableError();
    const [{ data: reservation }, { data: settlement }] = await Promise.all([
      this.client.from("reservations").select("state").eq("payment_request_id", paymentRequestId).maybeSingle(),
      this.client.from("settlements").select("transaction_signature").eq("payment_request_id", paymentRequestId).maybeSingle(),
    ]);
    return {
      id: String(payment.id),
      state: payment.state as PaymentRequestRecord["state"],
      amount: units(payment.amount_units),
      reservationState: (reservation?.state ?? null) as PaymentRequestRecord["reservationState"],
      transactionSignature:
        settlement?.transaction_signature ?? payment.pending_transaction_signature ?? null,
    };
  }

  async taskSnapshot(taskId: string, now: number): Promise<TaskSnapshot> {
    const [taskResult, mandateResult, delegationsResult, servicesResult, paymentsResult, eventsResult] = await Promise.all([
      this.client.from("tasks").select("*").eq("id", taskId).maybeSingle(),
      this.client.from("task_mandates").select("*").eq("task_id", taskId).maybeSingle(),
      this.client.from("delegations").select("*").eq("task_id", taskId).order("parent_id").order("id"),
      this.client.from("delegation_services").select("delegation_id,service_id"),
      this.client.from("payment_requests").select("*,delegations!inner(task_id),settlements(transaction_signature)").eq("delegations.task_id", taskId).order("created_at_ms"),
      this.client.from("events").select("*").eq("task_id", taskId).order("id", { ascending: false }).limit(100),
    ]);
    const failed = [taskResult, mandateResult, delegationsResult, servicesResult, paymentsResult, eventsResult]
      .some((result) => result.error);
    if (failed || !taskResult.data || !mandateResult.data) throw new StorageUnavailableError();
    const delegationRows = delegationsResult.data ?? [];
    const available = await Promise.all(
      delegationRows.map((row) => this.availableAmount(String(row.id), now)),
    );
    return {
      task: {
        id: String(taskResult.data.id),
        ownerWallet: String(taskResult.data.owner_wallet),
        allocation: units(taskResult.data.allocation_units),
        status: taskResult.data.status as "active" | "cancelled",
        expiresAt: Number(taskResult.data.expires_at_ms),
        mandate: {
          purpose: String(mandateResult.data.purpose),
          serviceId: String(mandateResult.data.service_id),
          resourceId: String(mandateResult.data.resource_id),
          maxAmount: units(mandateResult.data.max_amount_units),
        },
      },
      delegations: delegationRows.map((row, index) => ({
        id: String(row.id), parentId: row.parent_id ? String(row.parent_id) : null,
        allocation: units(row.allocation_units), available: available[index],
        status: row.status as "active" | "cancelled", expiresAt: Number(row.expires_at_ms),
        services: (servicesResult.data ?? []).filter((service) => service.delegation_id === row.id).map((service) => String(service.service_id)),
      })),
      payments: (paymentsResult.data ?? []).map((row) => ({
        id: String(row.id), delegationId: String(row.delegation_id), purchaseRef: String(row.purchase_ref),
        serviceId: String(row.service_id), resourceId: String(row.resource_id), amount: units(row.amount_units),
        state: row.state as PaymentRequestRecord["state"], rejectionCode: row.rejection_code ? String(row.rejection_code) : null,
        transactionSignature: row.settlements?.[0]?.transaction_signature ?? row.pending_transaction_signature ?? null,
      })),
      events: (eventsResult.data ?? []).map((row) => ({
        id: Number(row.id), eventType: String(row.event_type), delegationId: row.delegation_id ? String(row.delegation_id) : null,
        paymentRequestId: row.payment_request_id ? String(row.payment_request_id) : null,
        details: row.details, createdAt: Number(row.created_at_ms),
      })),
    };
  }
}
