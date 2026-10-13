export type DemoAuthorityStatus = "active" | "cancelled";

export interface PublicDemoDelegation {
  id: "manager" | "research" | "analysis";
  parentId: "manager" | null;
  name: string;
  allocation: bigint;
  available: bigint;
  status: DemoAuthorityStatus;
  services: string[];
}

export interface PublicDemoPayment {
  id: string;
  serviceId: string;
  amount: bigint;
  state: "settled" | "rejected";
  rejectionCode: "BUDGET_EXCEEDED" | "AUTHORITY_CANCELLED" | null;
  simulated: true;
}

export interface PublicDemoEvent {
  id: number;
  eventType: string;
  detail: string;
}

export interface PublicDemoState {
  taskAllocation: bigint;
  delegations: PublicDemoDelegation[];
  payments: PublicDemoPayment[];
  events: PublicDemoEvent[];
}

export type PublicDemoAction =
  | { type: "allow_purchase" }
  | { type: "reject_over_budget" }
  | { type: "cancel_research" }
  | { type: "reject_after_cancel" }
  | { type: "reset" };

function nextEvent(
  state: PublicDemoState,
  eventType: string,
  detail: string,
): PublicDemoEvent {
  return { id: state.events.length + 1, eventType, detail };
}

function settledFor(state: PublicDemoState, delegationId: string): bigint {
  return state.payments
    .filter(
      (payment) =>
        payment.state === "settled" &&
        payment.serviceId === `${delegationId}-api`,
    )
    .reduce((total, payment) => total + payment.amount, 0n);
}

function withAvailability(state: PublicDemoState): PublicDemoState {
  const children = state.delegations.filter(
    (delegation) => delegation.parentId === "manager",
  );
  const activeChildAllocation = children
    .filter((delegation) => delegation.status === "active")
    .reduce((total, delegation) => total + delegation.allocation, 0n);
  const inactiveChildSpend = children
    .filter((delegation) => delegation.status !== "active")
    .reduce(
      (total, delegation) => total + settledFor(state, delegation.id),
      0n,
    );

  return {
    ...state,
    delegations: state.delegations.map((delegation) => ({
      ...delegation,
      available:
        delegation.id === "manager"
          ? delegation.allocation - activeChildAllocation - inactiveChildSpend
          : delegation.allocation - settledFor(state, delegation.id),
    })),
  };
}

export function createPublicDemoState(): PublicDemoState {
  return withAvailability({
    taskAllocation: 10_000_000n,
    delegations: [
      {
        id: "manager",
        parentId: null,
        name: "Manager agent",
        allocation: 10_000_000n,
        available: 0n,
        status: "active",
        services: ["research-api", "analysis-api"],
      },
      {
        id: "research",
        parentId: "manager",
        name: "Research agent",
        allocation: 4_000_000n,
        available: 0n,
        status: "active",
        services: ["research-api"],
      },
      {
        id: "analysis",
        parentId: "manager",
        name: "Analysis agent",
        allocation: 3_000_000n,
        available: 0n,
        status: "active",
        services: ["analysis-api"],
      },
    ],
    payments: [],
    events: [
      { id: 1, eventType: "task.created", detail: "10 test USDC allocated" },
      { id: 2, eventType: "delegation.created", detail: "Research · 4 USDC" },
      { id: 3, eventType: "delegation.created", detail: "Analysis · 3 USDC" },
    ],
  });
}

export function reducePublicDemo(
  state: PublicDemoState,
  action: PublicDemoAction,
): PublicDemoState {
  if (action.type === "reset") return createPublicDemoState();

  if (action.type === "allow_purchase") {
    if (state.payments.some((payment) => payment.id === "demo-allowed")) {
      return state;
    }
    const next = {
      ...state,
      payments: [
        ...state.payments,
        {
          id: "demo-allowed",
          serviceId: "research-api",
          amount: 1_000n,
          state: "settled" as const,
          rejectionCode: null,
          simulated: true as const,
        },
      ],
      events: [
        ...state.events,
        nextEvent(
          state,
          "payment.simulated_settled",
          "research-api · 1,000 base units",
        ),
      ],
    };
    return withAvailability(next);
  }

  if (action.type === "reject_over_budget") {
    if (state.payments.some((payment) => payment.id === "demo-over-budget")) {
      return state;
    }
    return withAvailability({
      ...state,
      payments: [
        ...state.payments,
        {
          id: "demo-over-budget",
          serviceId: "research-api",
          amount: 5_000_000n,
          state: "rejected",
          rejectionCode: "BUDGET_EXCEEDED",
          simulated: true,
        },
      ],
      events: [
        ...state.events,
        nextEvent(
          state,
          "payment.rejected",
          "BUDGET_EXCEEDED · nothing signed or broadcast",
        ),
      ],
    });
  }

  if (action.type === "cancel_research") {
    const research = state.delegations.find(
      (delegation) => delegation.id === "research",
    );
    if (!research || research.status === "cancelled") return state;
    return withAvailability({
      ...state,
      delegations: state.delegations.map((delegation) =>
        delegation.id === "research"
          ? { ...delegation, status: "cancelled" as const }
          : delegation,
      ),
      events: [
        ...state.events,
        nextEvent(state, "delegation.cancelled", "Research authority cancelled"),
      ],
    });
  }

  if (state.payments.some((payment) => payment.id === "demo-after-cancel")) {
    return state;
  }
  const research = state.delegations.find(
    (delegation) => delegation.id === "research",
  );
  if (research?.status !== "cancelled") return state;
  return withAvailability({
    ...state,
    payments: [
      ...state.payments,
      {
        id: "demo-after-cancel",
        serviceId: "research-api",
        amount: 1_000n,
        state: "rejected",
        rejectionCode: "AUTHORITY_CANCELLED",
        simulated: true,
      },
    ],
    events: [
      ...state.events,
      nextEvent(
        state,
        "payment.rejected",
        "AUTHORITY_CANCELLED · nothing signed or broadcast",
      ),
    ],
  });
}
