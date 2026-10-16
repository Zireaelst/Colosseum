export async function checkFundingConfirmation(
  taskId: string,
  submittedSignature: string,
  request: typeof fetch = fetch,
): Promise<"confirmed" | "pending" | "rejected" | "unauthorized"> {
  try {
    const response = await request(`/api/tasks/${encodeURIComponent(taskId)}/funding-status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signature: submittedSignature }),
      cache: "no-store",
    });
    if (response.status === 401) return "unauthorized";
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("state" in body)) return "pending";
    if (response.status === 200 && body.state === "confirmed" && "signature" in body && body.signature === submittedSignature) return "confirmed";
    if (response.status === 422 && body.state === "rejected") return "rejected";
  } catch {
    // Unknown results keep the submitted transaction pending. Never re-fund here.
  }
  return "pending";
}
