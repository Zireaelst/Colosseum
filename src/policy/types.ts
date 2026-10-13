export type DelegationStatus = "active" | "cancelled";

export interface DelegationAuthority {
  readonly allocation: bigint;
  readonly available: bigint;
  readonly expiresAt: number;
  readonly services: readonly string[];
  readonly status: DelegationStatus;
}

export interface ChildDelegationProposal {
  readonly allocation: bigint;
  readonly expiresAt: number;
  readonly services: readonly string[];
}

export type PolicyRejectionCode =
  | "AUTHORITY_CANCELLED"
  | "AUTHORITY_EXPIRED"
  | "INVALID_ALLOCATION"
  | "BUDGET_EXCEEDED"
  | "INVALID_EXPIRY"
  | "SERVICE_NOT_ALLOWED"
  | "INVALID_SERVICE_SET";

export type PolicyDecision =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: PolicyRejectionCode;
      readonly message: string;
    };
