export interface TaskSnapshotDto {
  delegations: Array<{
    id: string;
    parentId: string | null;
    allocation: string;
    available: string;
    status: string;
    services: string[];
  }>;
  payments: Array<{
    id: string;
    serviceId: string;
    amount: string;
    state: string;
    rejectionCode: string | null;
    transactionSignature: string | null;
  }>;
  events: Array<{ id: number; eventType: string; details: unknown }>;
}

export function unitsToToken(value: string): string {
  const units = BigInt(value);
  const whole = units / 1_000_000n;
  const fraction = (units % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function toTaskViewModel(snapshot: TaskSnapshotDto) {
  return {
    delegations: snapshot.delegations.map((delegation) => ({
      ...delegation,
      name: delegation.id.split(":").at(-1) ?? delegation.id,
      depth: delegation.parentId ? 1 : 0,
      allocation: unitsToToken(delegation.allocation),
      available: unitsToToken(delegation.available),
    })),
    payments: snapshot.payments.map((payment) => ({
      ...payment,
      amount: unitsToToken(payment.amount),
      label: payment.rejectionCode
        ? `${payment.state.toUpperCase()} · ${payment.rejectionCode}`
        : payment.state.toUpperCase(),
      tone: payment.state === "rejected" ? "danger" : payment.state === "settled" ? "success" : "warning",
      explorerUrl: payment.transactionSignature
        ? `https://explorer.solana.com/tx/${payment.transactionSignature}?cluster=devnet`
        : null,
    })),
    events: snapshot.events,
  };
}
