import type {
  ChildDelegationProposal,
  DelegationAuthority,
  PolicyDecision,
} from "./types";

export function validateChildDelegation(
  parent: DelegationAuthority,
  proposal: ChildDelegationProposal,
  now: number,
): PolicyDecision {
  if (parent.status === "cancelled") {
    return {
      ok: false,
      code: "AUTHORITY_CANCELLED",
      message: "Cancelled authority cannot create child delegations",
    };
  }

  if (parent.expiresAt <= now) {
    return {
      ok: false,
      code: "AUTHORITY_EXPIRED",
      message: "Expired authority cannot create child delegations",
    };
  }

  if (proposal.allocation <= 0n) {
    return {
      ok: false,
      code: "INVALID_ALLOCATION",
      message: "Child allocation must be a positive base-unit integer",
    };
  }

  if (proposal.allocation > parent.available) {
    return {
      ok: false,
      code: "BUDGET_EXCEEDED",
      message: "Child allocation exceeds the parent's available amount",
    };
  }

  if (proposal.expiresAt <= now || proposal.expiresAt > parent.expiresAt) {
    return {
      ok: false,
      code: "INVALID_EXPIRY",
      message:
        "Child expiry must be in the future and no later than the parent expiry",
    };
  }

  const childServices = new Set(proposal.services);
  if (
    proposal.services.length === 0 ||
    childServices.size !== proposal.services.length
  ) {
    return {
      ok: false,
      code: "INVALID_SERVICE_SET",
      message: "Child services must be a non-empty set of unique identifiers",
    };
  }

  const parentServices = new Set(parent.services);
  const disallowedService = proposal.services.find(
    (service) => !parentServices.has(service),
  );

  if (disallowedService !== undefined) {
    return {
      ok: false,
      code: "SERVICE_NOT_ALLOWED",
      message: `Service '${disallowedService}' is not allowed by the parent authority`,
    };
  }

  return { ok: true };
}
