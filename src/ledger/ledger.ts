import { randomUUID } from "node:crypto";

import Database from "better-sqlite3";

import { validateChildDelegation } from "../policy/delegation";
import type { PolicyRejectionCode } from "../policy/types";

export interface CreateTaskInput {
  id: string;
  ownerWallet: string;
  allocation: bigint;
  expiresAt: number;
}

export interface CreateDelegationInput {
  id: string;
  taskId: string;
  parentId: string | null;
  allocation: bigint;
  expiresAt: number;
  services: readonly string[];
  now: number;
}

export interface ReservePurchaseInput {
  delegationId: string;
  purchaseKey: string;
  serviceId: string;
  amount: bigint;
  now: number;
}

export interface ReservedPurchase {
  ok: true;
  paymentRequestId: string;
  replayed: boolean;
  state: "reserved" | "settlement_pending" | "settled";
  amount: bigint;
  availableAfter: bigint;
}

export type ReservationRejectionCode =
  | "BUDGET_EXCEEDED"
  | "SERVICE_NOT_ALLOWED"
  | "AUTHORITY_CANCELLED"
  | "AUTHORITY_EXPIRED"
  | "INVALID_AMOUNT"
  | "SETTLEMENT_FAILED";

export interface RejectedPurchase {
  ok: false;
  paymentRequestId: string;
  replayed: boolean;
  state: "rejected" | "failed";
  code: ReservationRejectionCode;
  amount: bigint;
  availableAfter: bigint;
}

export type ReservePurchaseResult = ReservedPurchase | RejectedPurchase;

export interface PaymentRequestRecord {
  id: string;
  state:
    | "reserved"
    | "settlement_pending"
    | "settled"
    | "failed"
    | "rejected";
  amount: bigint;
  reservationState: "pending" | "settled" | "released" | null;
  transactionSignature: string | null;
}

export interface TaskSnapshot {
  task: {
    id: string;
    ownerWallet: string;
    allocation: bigint;
    status: "active" | "cancelled";
    expiresAt: number;
  };
  delegations: Array<{
    id: string;
    parentId: string | null;
    allocation: bigint;
    available: bigint;
    status: "active" | "cancelled";
    expiresAt: number;
    services: string[];
  }>;
  payments: Array<{
    id: string;
    delegationId: string;
    purchaseKey: string;
    serviceId: string;
    amount: bigint;
    state: PaymentRequestRecord["state"];
    rejectionCode: string | null;
    transactionSignature: string | null;
  }>;
  events: Array<{
    id: number;
    eventType: string;
    delegationId: string | null;
    paymentRequestId: string | null;
    details: unknown;
    createdAt: number;
  }>;
}

interface AvailableRow {
  available: bigint;
}

interface ExistingPaymentRow {
  id: string;
  amount_units: bigint;
  state:
    | "reserved"
    | "settlement_pending"
    | "settled"
    | "failed"
    | "rejected";
  rejection_code: ReservationRejectionCode | null;
}

interface AuthorityRow {
  status: "active" | "cancelled";
  expires_at_ms: bigint;
}

interface ParentDelegationRow extends AuthorityRow {
  task_id: string;
  allocation_units: bigint;
}

interface ServiceRow {
  service_id: string;
}

interface PaymentRequestRow {
  id: string;
  state: PaymentRequestRecord["state"];
  amount_units: bigint;
  reservation_state: PaymentRequestRecord["reservationState"];
  transaction_signature: string | null;
}

const schema = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    owner_wallet TEXT NOT NULL,
    allocation_units INTEGER NOT NULL CHECK (allocation_units > 0),
    expires_at_ms INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled'))
  );

  CREATE TABLE IF NOT EXISTS delegations (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    parent_id TEXT REFERENCES delegations(id),
    allocation_units INTEGER NOT NULL CHECK (allocation_units > 0),
    expires_at_ms INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled'))
  );

  CREATE TABLE IF NOT EXISTS delegation_services (
    delegation_id TEXT NOT NULL REFERENCES delegations(id),
    service_id TEXT NOT NULL,
    PRIMARY KEY (delegation_id, service_id)
  );

  CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    delegation_id TEXT NOT NULL REFERENCES delegations(id),
    purchase_key TEXT NOT NULL,
    service_id TEXT NOT NULL,
    amount_units INTEGER NOT NULL,
    state TEXT NOT NULL CHECK (
      state IN ('reserved', 'settlement_pending', 'settled', 'failed', 'rejected')
    ),
    rejection_code TEXT,
    pending_transaction_signature TEXT UNIQUE,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    UNIQUE (delegation_id, purchase_key)
  );

  CREATE TABLE IF NOT EXISTS reservations (
    payment_request_id TEXT PRIMARY KEY REFERENCES payment_requests(id),
    delegation_id TEXT NOT NULL REFERENCES delegations(id),
    amount_units INTEGER NOT NULL CHECK (amount_units > 0),
    state TEXT NOT NULL CHECK (state IN ('pending', 'settled', 'released')),
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    payment_request_id TEXT NOT NULL UNIQUE REFERENCES payment_requests(id),
    state TEXT NOT NULL CHECK (state IN ('confirmed', 'failed')),
    transaction_signature TEXT UNIQUE,
    failure_code TEXT,
    created_at_ms INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    delegation_id TEXT REFERENCES delegations(id),
    payment_request_id TEXT REFERENCES payment_requests(id),
    event_type TEXT NOT NULL,
    details_json TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL
  );
`;

export class LedgerPolicyError extends Error {
  constructor(
    readonly code: PolicyRejectionCode,
    message: string,
  ) {
    super(message);
    this.name = "LedgerPolicyError";
  }
}

export class Ledger {
  private constructor(private readonly database: Database.Database) {
    this.database.pragma("foreign_keys = ON");
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("busy_timeout = 5000");
    this.database.defaultSafeIntegers(true);
    this.database.exec(schema);
    const columns = this.database.pragma("table_info(payment_requests)") as Array<{
      name: string;
    }>;
    if (!columns.some((column) => column.name === "pending_transaction_signature")) {
      this.database.exec(
        "ALTER TABLE payment_requests ADD COLUMN pending_transaction_signature TEXT",
      );
    }
    this.database.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_pending_signature
       ON payment_requests(pending_transaction_signature)
       WHERE pending_transaction_signature IS NOT NULL`,
    );
  }

  static memory(): Ledger {
    return new Ledger(new Database(":memory:"));
  }

  static open(path: string): Ledger {
    return new Ledger(new Database(path));
  }

  close(): void {
    this.database.close();
  }

  createTask(input: CreateTaskInput): void {
    this.database
      .prepare(
        `INSERT INTO tasks (
          id, owner_wallet, allocation_units, expires_at_ms, status
        ) VALUES (?, ?, ?, ?, 'active')`,
      )
      .run(input.id, input.ownerWallet, input.allocation, input.expiresAt);
  }

  createDelegation(input: CreateDelegationInput): void {
    const insert = this.database.transaction(() => {
      if (input.parentId !== null) {
        const parent = this.database
          .prepare(
            `SELECT task_id, allocation_units, expires_at_ms, status
             FROM delegations WHERE id = ?`,
          )
          .get(input.parentId) as ParentDelegationRow | undefined;

        if (parent === undefined || parent.task_id !== input.taskId) {
          throw new Error(
            `Parent delegation '${input.parentId}' is not part of task '${input.taskId}'`,
          );
        }

        const serviceRows = this.database
          .prepare(
            `SELECT service_id FROM delegation_services
             WHERE delegation_id = ? ORDER BY service_id`,
          )
          .all(input.parentId) as ServiceRow[];

        const decision = validateChildDelegation(
          {
            allocation: parent.allocation_units,
            available: this.availableAmount(input.parentId, input.now),
            expiresAt: Number(parent.expires_at_ms),
            services: serviceRows.map((row) => row.service_id),
            status: parent.status,
          },
          {
            allocation: input.allocation,
            expiresAt: input.expiresAt,
            services: input.services,
          },
          input.now,
        );

        if (!decision.ok) {
          throw new LedgerPolicyError(decision.code, decision.message);
        }
      }

      this.database
        .prepare(
          `INSERT INTO delegations (
            id, task_id, parent_id, allocation_units, expires_at_ms, status
          ) VALUES (?, ?, ?, ?, ?, 'active')`,
        )
        .run(
          input.id,
          input.taskId,
          input.parentId,
          input.allocation,
          input.expiresAt,
        );

      const insertService = this.database.prepare(
        `INSERT INTO delegation_services (delegation_id, service_id)
         VALUES (?, ?)`,
      );
      for (const serviceId of input.services) {
        insertService.run(input.id, serviceId);
      }
    });

    insert.immediate();
  }

  cancelDelegation(delegationId: string, now: number): void {
    const cancel = this.database.transaction(() => {
      const result = this.database
        .prepare(
          `UPDATE delegations SET status = 'cancelled'
           WHERE id = ? AND status = 'active'`,
        )
        .run(delegationId);

      if (result.changes === 0) {
        throw new Error(`Unknown or inactive delegation '${delegationId}'`);
      }

      this.database
        .prepare(
          `INSERT INTO events (
            task_id, delegation_id, event_type, details_json, created_at_ms
          )
          SELECT task_id, id, 'delegation_cancelled', '{}', ?
          FROM delegations WHERE id = ?`,
        )
        .run(now, delegationId);
    });

    cancel.immediate();
  }

  markSettlementPending(paymentRequestId: string, now: number): void {
    const markPending = this.database.transaction(() => {
      const result = this.database
        .prepare(
          `UPDATE payment_requests
           SET state = 'settlement_pending', updated_at_ms = ?
           WHERE id = ? AND state = 'reserved'`,
        )
        .run(now, paymentRequestId);

      if (result.changes === 0) {
        throw new Error(
          `Payment request '${paymentRequestId}' is not in reserved state`,
        );
      }

      this.database
        .prepare(
          `INSERT INTO events (
            task_id, delegation_id, payment_request_id, event_type,
            details_json, created_at_ms
          )
          SELECT d.task_id, p.delegation_id, p.id,
            'settlement_pending', '{}', ?
          FROM payment_requests p
          JOIN delegations d ON d.id = p.delegation_id
          WHERE p.id = ?`,
        )
        .run(now, paymentRequestId);
    });

    markPending.immediate();
  }

  recordPendingSignature(
    paymentRequestId: string,
    transactionSignature: string,
    now: number,
  ): void {
    const result = this.database
      .prepare(
        `UPDATE payment_requests
         SET pending_transaction_signature = ?, updated_at_ms = ?
         WHERE id = ? AND state = 'settlement_pending'
           AND (pending_transaction_signature IS NULL
             OR pending_transaction_signature = ?)`,
      )
      .run(
        transactionSignature,
        now,
        paymentRequestId,
        transactionSignature,
      );
    if (result.changes === 0) {
      throw new Error(
        `Payment request '${paymentRequestId}' cannot record pending signature`,
      );
    }
  }

  failPayment(
    paymentRequestId: string,
    failureCode: string,
    now: number,
  ): void {
    const fail = this.database.transaction(() => {
      const result = this.database
        .prepare(
          `UPDATE payment_requests
           SET state = 'failed', rejection_code = 'SETTLEMENT_FAILED',
             updated_at_ms = ?
           WHERE id = ? AND state IN ('reserved', 'settlement_pending')`,
        )
        .run(now, paymentRequestId);

      if (result.changes === 0) {
        throw new Error(
          `Payment request '${paymentRequestId}' cannot transition to failed`,
        );
      }

      this.database
        .prepare(
          `UPDATE reservations
           SET state = 'released', updated_at_ms = ?
           WHERE payment_request_id = ? AND state = 'pending'`,
        )
        .run(now, paymentRequestId);

      this.database
        .prepare(
          `INSERT INTO settlements (
            id, payment_request_id, state, failure_code, created_at_ms
          ) VALUES (?, ?, 'failed', ?, ?)`,
        )
        .run(randomUUID(), paymentRequestId, failureCode, now);

      this.database
        .prepare(
          `INSERT INTO events (
            task_id, delegation_id, payment_request_id, event_type,
            details_json, created_at_ms
          )
          SELECT d.task_id, p.delegation_id, p.id,
            'payment_failed', ?, ?
          FROM payment_requests p
          JOIN delegations d ON d.id = p.delegation_id
          WHERE p.id = ?`,
        )
        .run(JSON.stringify({ failureCode }), now, paymentRequestId);
    });

    fail.immediate();
  }

  confirmSettlement(
    paymentRequestId: string,
    transactionSignature: string,
    now: number,
  ): void {
    const confirm = this.database.transaction(() => {
      const result = this.database
        .prepare(
          `UPDATE payment_requests
           SET state = 'settled', updated_at_ms = ?
           WHERE id = ? AND state = 'settlement_pending'`,
        )
        .run(now, paymentRequestId);

      if (result.changes === 0) {
        throw new Error(
          `Payment request '${paymentRequestId}' cannot transition to settled`,
        );
      }

      this.database
        .prepare(
          `UPDATE reservations
           SET state = 'settled', updated_at_ms = ?
           WHERE payment_request_id = ? AND state = 'pending'`,
        )
        .run(now, paymentRequestId);

      this.database
        .prepare(
          `INSERT INTO settlements (
            id, payment_request_id, state, transaction_signature, created_at_ms
          ) VALUES (?, ?, 'confirmed', ?, ?)`,
        )
        .run(randomUUID(), paymentRequestId, transactionSignature, now);

      this.database
        .prepare(
          `INSERT INTO events (
            task_id, delegation_id, payment_request_id, event_type,
            details_json, created_at_ms
          )
          SELECT d.task_id, p.delegation_id, p.id,
            'payment_settled', ?, ?
          FROM payment_requests p
          JOIN delegations d ON d.id = p.delegation_id
          WHERE p.id = ?`,
        )
        .run(
          JSON.stringify({ transactionSignature }),
          now,
          paymentRequestId,
        );
    });

    confirm.immediate();
  }

  paymentRequest(paymentRequestId: string): PaymentRequestRecord {
    const row = this.database
      .prepare(
        `SELECT p.id, p.state, p.amount_units,
          r.state AS reservation_state,
          COALESCE(s.transaction_signature, p.pending_transaction_signature)
            AS transaction_signature
         FROM payment_requests p
         LEFT JOIN reservations r ON r.payment_request_id = p.id
         LEFT JOIN settlements s ON s.payment_request_id = p.id
         WHERE p.id = ?`,
      )
      .get(paymentRequestId) as PaymentRequestRow | undefined;

    if (row === undefined) {
      throw new Error(`Unknown payment request '${paymentRequestId}'`);
    }

    return {
      id: row.id,
      state: row.state,
      amount: row.amount_units,
      reservationState: row.reservation_state,
      transactionSignature: row.transaction_signature,
    };
  }

  taskSnapshot(taskId: string, now: number): TaskSnapshot {
    const task = this.database
      .prepare(
        `SELECT id, owner_wallet, allocation_units, status, expires_at_ms
         FROM tasks WHERE id = ?`,
      )
      .get(taskId) as
      | {
          id: string;
          owner_wallet: string;
          allocation_units: bigint;
          status: "active" | "cancelled";
          expires_at_ms: bigint;
        }
      | undefined;
    if (!task) throw new Error(`Unknown task '${taskId}'`);

    const delegationRows = this.database
      .prepare(
        `SELECT id, parent_id, allocation_units, status, expires_at_ms
         FROM delegations WHERE task_id = ? ORDER BY parent_id, id`,
      )
      .all(taskId) as Array<{
      id: string;
      parent_id: string | null;
      allocation_units: bigint;
      status: "active" | "cancelled";
      expires_at_ms: bigint;
    }>;
    const serviceQuery = this.database.prepare(
      `SELECT service_id FROM delegation_services
       WHERE delegation_id = ? ORDER BY service_id`,
    );
    const payments = this.database
      .prepare(
        `SELECT p.id, p.delegation_id, p.purchase_key, p.service_id,
          p.amount_units, p.state, p.rejection_code,
          COALESCE(s.transaction_signature, p.pending_transaction_signature)
            AS transaction_signature
         FROM payment_requests p
         JOIN delegations d ON d.id = p.delegation_id
         LEFT JOIN settlements s ON s.payment_request_id = p.id
         WHERE d.task_id = ? ORDER BY p.created_at_ms, p.id`,
      )
      .all(taskId) as Array<{
      id: string;
      delegation_id: string;
      purchase_key: string;
      service_id: string;
      amount_units: bigint;
      state: PaymentRequestRecord["state"];
      rejection_code: string | null;
      transaction_signature: string | null;
    }>;
    const events = this.database
      .prepare(
        `SELECT id, event_type, delegation_id, payment_request_id,
          details_json, created_at_ms
         FROM events WHERE task_id = ? ORDER BY id DESC LIMIT 100`,
      )
      .all(taskId) as Array<{
      id: bigint;
      event_type: string;
      delegation_id: string | null;
      payment_request_id: string | null;
      details_json: string;
      created_at_ms: bigint;
    }>;

    return {
      task: {
        id: task.id,
        ownerWallet: task.owner_wallet,
        allocation: task.allocation_units,
        status: task.status,
        expiresAt: Number(task.expires_at_ms),
      },
      delegations: delegationRows.map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        allocation: row.allocation_units,
        available: this.availableAmount(row.id, now),
        status: row.status,
        expiresAt: Number(row.expires_at_ms),
        services: (serviceQuery.all(row.id) as ServiceRow[]).map(
          (service) => service.service_id,
        ),
      })),
      payments: payments.map((row) => ({
        id: row.id,
        delegationId: row.delegation_id,
        purchaseKey: row.purchase_key,
        serviceId: row.service_id,
        amount: row.amount_units,
        state: row.state,
        rejectionCode: row.rejection_code,
        transactionSignature: row.transaction_signature,
      })),
      events: events.map((row) => ({
        id: Number(row.id),
        eventType: row.event_type,
        delegationId: row.delegation_id,
        paymentRequestId: row.payment_request_id,
        details: JSON.parse(row.details_json) as unknown,
        createdAt: Number(row.created_at_ms),
      })),
    };
  }

  availableAmount(delegationId: string, now: number): bigint {
    const row = this.database
      .prepare(
        `SELECT
          d.allocation_units
          - COALESCE((
              SELECT SUM(r.amount_units)
              FROM reservations r
              WHERE r.delegation_id = d.id
                AND r.state IN ('pending', 'settled')
            ), 0)
          - COALESCE((
              SELECT SUM(c.allocation_units)
              FROM delegations c
              WHERE c.parent_id = d.id
                AND c.status = 'active'
                AND c.expires_at_ms > ?
            ), 0)
          - COALESCE((
              WITH RECURSIVE inactive_descendants(id) AS (
                SELECT c.id
                FROM delegations c
                WHERE c.parent_id = d.id
                  AND (c.status != 'active' OR c.expires_at_ms <= ?)
                UNION ALL
                SELECT c.id
                FROM delegations c
                JOIN inactive_descendants p ON c.parent_id = p.id
              )
              SELECT SUM(r.amount_units)
              FROM reservations r
              JOIN inactive_descendants x ON x.id = r.delegation_id
              WHERE r.state IN ('pending', 'settled')
            ), 0) AS available
         FROM delegations d
         WHERE d.id = ?`,
      )
      .get(now, now, delegationId) as AvailableRow | undefined;

    if (row === undefined) {
      throw new Error(`Unknown delegation '${delegationId}'`);
    }

    return row.available;
  }

  private recordRejection(
    input: ReservePurchaseInput,
    paymentRequestId: string,
    code: ReservationRejectionCode,
    availableAfter: bigint,
  ): RejectedPurchase {
    this.database
      .prepare(
        `INSERT INTO payment_requests (
          id, delegation_id, purchase_key, service_id, amount_units,
          state, rejection_code, created_at_ms, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, 'rejected', ?, ?, ?)`,
      )
      .run(
        paymentRequestId,
        input.delegationId,
        input.purchaseKey,
        input.serviceId,
        input.amount,
        code,
        input.now,
        input.now,
      );

    this.database
      .prepare(
        `INSERT INTO events (
          task_id, delegation_id, payment_request_id, event_type,
          details_json, created_at_ms
        )
        SELECT task_id, id, ?, 'payment_rejected', ?, ?
        FROM delegations WHERE id = ?`,
      )
      .run(
        paymentRequestId,
        JSON.stringify({ code }),
        input.now,
        input.delegationId,
      );

    return {
      ok: false,
      paymentRequestId,
      replayed: false,
      state: "rejected",
      code,
      amount: input.amount,
      availableAfter,
    };
  }

  reservePurchase(input: ReservePurchaseInput): ReservePurchaseResult {
    const reserve = this.database.transaction((): ReservePurchaseResult => {
      const existing = this.database
        .prepare(
          `SELECT id, amount_units, state, rejection_code
           FROM payment_requests
           WHERE delegation_id = ? AND purchase_key = ?`,
        )
        .get(input.delegationId, input.purchaseKey) as
        | ExistingPaymentRow
        | undefined;

      if (existing !== undefined) {
        const availableAfter = this.availableAmount(
          input.delegationId,
          input.now,
        );
        if (existing.state === "rejected" || existing.state === "failed") {
          return {
            ok: false,
            paymentRequestId: existing.id,
            replayed: true,
            state: existing.state,
            code: existing.rejection_code ?? "SETTLEMENT_FAILED",
            amount: existing.amount_units,
            availableAfter,
          };
        }

        return {
          ok: true,
          paymentRequestId: existing.id,
          replayed: true,
          state: existing.state,
          amount: existing.amount_units,
          availableAfter,
        };
      }

      const paymentRequestId = randomUUID();
      const availableBefore = this.availableAmount(input.delegationId, input.now);

      if (input.amount <= 0n) {
        return this.recordRejection(
          input,
          paymentRequestId,
          "INVALID_AMOUNT",
          availableBefore,
        );
      }

      const authority = this.database
        .prepare(
          `SELECT status, expires_at_ms
           FROM delegations WHERE id = ?`,
        )
        .get(input.delegationId) as AuthorityRow;

      if (authority.status === "cancelled") {
        return this.recordRejection(
          input,
          paymentRequestId,
          "AUTHORITY_CANCELLED",
          availableBefore,
        );
      }

      if (authority.expires_at_ms <= BigInt(input.now)) {
        return this.recordRejection(
          input,
          paymentRequestId,
          "AUTHORITY_EXPIRED",
          availableBefore,
        );
      }

      const serviceAllowed = this.database
        .prepare(
          `SELECT 1
           FROM delegation_services
           WHERE delegation_id = ? AND service_id = ?`,
        )
        .get(input.delegationId, input.serviceId);

      if (serviceAllowed === undefined) {
        return this.recordRejection(
          input,
          paymentRequestId,
          "SERVICE_NOT_ALLOWED",
          availableBefore,
        );
      }

      if (input.amount > availableBefore) {
        return this.recordRejection(
          input,
          paymentRequestId,
          "BUDGET_EXCEEDED",
          availableBefore,
        );
      }

      this.database
        .prepare(
          `INSERT INTO payment_requests (
            id, delegation_id, purchase_key, service_id, amount_units,
            state, created_at_ms, updated_at_ms
          ) VALUES (?, ?, ?, ?, ?, 'reserved', ?, ?)`,
        )
        .run(
          paymentRequestId,
          input.delegationId,
          input.purchaseKey,
          input.serviceId,
          input.amount,
          input.now,
          input.now,
        );

      this.database
        .prepare(
          `INSERT INTO reservations (
            payment_request_id, delegation_id, amount_units, state,
            created_at_ms, updated_at_ms
          ) VALUES (?, ?, ?, 'pending', ?, ?)`,
        )
        .run(
          paymentRequestId,
          input.delegationId,
          input.amount,
          input.now,
          input.now,
        );

      this.database
        .prepare(
          `INSERT INTO events (
            task_id, delegation_id, payment_request_id, event_type,
            details_json, created_at_ms
          )
          SELECT task_id, id, ?, 'payment_reserved', ?, ?
          FROM delegations WHERE id = ?`,
        )
        .run(
          paymentRequestId,
          JSON.stringify({
            amount: input.amount.toString(),
            purchaseKey: input.purchaseKey,
            serviceId: input.serviceId,
          }),
          input.now,
          input.delegationId,
        );

      return {
        ok: true,
        paymentRequestId,
        replayed: false,
        state: "reserved",
        amount: input.amount,
        availableAfter: availableBefore - input.amount,
      };
    });

    return reserve.immediate();
  }
}
