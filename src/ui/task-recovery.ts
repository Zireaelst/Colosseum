export function recoverFundingState(account: { fundingSignature?: string }, submittedSignature: string | null): {
  state: "confirmed" | "confirming" | "idle";
  signature: string | null;
} {
  if (account.fundingSignature) return { state: "confirmed", signature: account.fundingSignature };
  if (submittedSignature) return { state: "confirming", signature: submittedSignature };
  return { state: "idle", signature: null };
}

export function readSubmittedFunding(taskId: string): string | null {
  try { return window.localStorage.getItem(`pactlet:submitted-funding:${taskId}`); }
  catch { return null; }
}

export function rememberSubmittedFunding(taskId: string, signature: string): void {
  try { window.localStorage.setItem(`pactlet:submitted-funding:${taskId}`, signature); }
  catch { /* Browser storage is best effort; server confirmation remains authoritative. */ }
}
