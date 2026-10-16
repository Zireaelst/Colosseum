import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), list: vi.fn() }));
vi.mock("../auth/store", () => ({
  walletForSession: mocks.session,
  taskAccountStore: { listForOwner: mocks.list },
  assertTaskAccountStoreConfigured: vi.fn(),
}));
vi.mock("../runtime/store", () => ({ ledger: {} }));

import { GET as listTasks } from "../../app/api/tasks/route";
import { GET as getSession, DELETE as endSession } from "../../app/api/auth/session/route";

beforeEach(() => { vi.clearAllMocks(); mocks.session.mockReturnValue("owner-a"); mocks.list.mockResolvedValue([]); });

describe("private task history routes", () => {
  it("takes the owner from the session, never query parameters, and disables caching", async () => {
    mocks.list.mockResolvedValue([{ id: "task-a", paymentAddress: "payer-a" }]);
    const response = await listTasks(new NextRequest("https://pactlet.example/api/tasks?owner=owner-b"));
    expect(mocks.list).toHaveBeenCalledWith("owner-a", 0);
    expect(await response.json()).toEqual({ tasks: [{ id: "task-a", paymentAddress: "payer-a" }], hasMore: false });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects unauthenticated history and invalid pagination before reading data", async () => {
    mocks.session.mockReturnValue(null);
    expect((await listTasks(new NextRequest("https://pactlet.example/api/tasks"))).status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
    mocks.session.mockReturnValue("owner-a");
    expect((await listTasks(new NextRequest("https://pactlet.example/api/tasks?offset=-1"))).status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("returns a bounded page and a safe retryable error", async () => {
    mocks.list.mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ id: String(i), paymentAddress: "payer" })));
    const response = await listTasks(new NextRequest("https://pactlet.example/api/tasks?offset=20"));
    const body = await response.json();
    expect(body.tasks).toHaveLength(20);
    expect(body.hasMore).toBe(true);
    expect(mocks.list).toHaveBeenCalledWith("owner-a", 20);
    mocks.list.mockRejectedValue(new Error("private database details"));
    const failed = await listTasks(new NextRequest("https://pactlet.example/api/tasks"));
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({ error: "TASK_HISTORY_UNAVAILABLE" });
  });

  it("restores only a valid server session and clears it on logout", async () => {
    const response = await getSession(new NextRequest("https://pactlet.example/api/auth/session"));
    expect(await response.json()).toEqual({ address: "owner-a" });
    expect(response.headers.get("cache-control")).toContain("no-store");
    mocks.session.mockReturnValue(null);
    expect((await getSession(new NextRequest("https://pactlet.example/api/auth/session"))).status).toBe(401);
    expect((await endSession()).headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
