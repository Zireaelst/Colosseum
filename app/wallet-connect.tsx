"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  sendWalletTransactionBytes,
  signWalletMessage,
  type UiWallet,
  type UiWalletAccount,
  walletClient,
} from "@pactlet/wallet-kit";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useIsWalletReady,
  useWallets,
} from "@pactlet/wallet-kit/react";

import { TaskDashboard, type AgentRunView } from "./components/task-dashboard";
import { AppProgress } from "./components/app-progress";
import { TaskHistory } from "./components/task-history";
import type { TaskHistoryEntry } from "../src/ui/task-history";
import type { PublicTaskAccount } from "../src/solana/task-accounts";
import { recoverFundingState, readSubmittedFunding, rememberSubmittedFunding } from "../src/ui/task-recovery";
import type { TaskSnapshotDto } from "../src/ui/task-view-model";
import { checkFundingConfirmation } from "../src/ui/funding-status";
import {
  shouldRenderWalletLoading,
  walletEmptyState,
} from "../src/solana/wallet-ui-state";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function WalletButton({
  wallet,
  onVerified,
}: {
  wallet: UiWallet;
  onVerified(account: UiWalletAccount): void;
}) {
  const connect = useConnect(walletClient);
  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  async function authenticate() {
    if (authenticating) return;
    setAuthenticating(true);
    setError(null);
    try {
      const accounts = await connect.dispatchAsync(wallet);
      const account = accounts.find((candidate) =>
        candidate.chains.some((chain) => chain.startsWith("solana:")),
      );
      if (!account) throw new Error("Wallet did not expose a Solana account");
      await proveOwnership(account);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet connection failed");
    } finally {
      setAuthenticating(false);
    }
  }

  async function proveOwnership(account: UiWalletAccount) {
    const challengeResponse = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: account.address }),
    });
    if (!challengeResponse.ok) throw new Error("Could not create wallet nonce");
    const challenge = (await challengeResponse.json()) as { message: string };
    const signature = await signWalletMessage(
      new TextEncoder().encode(challenge.message),
    );

    const verifyResponse = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address: account.address,
        message: challenge.message,
        signature: bytesToBase64(signature),
      }),
    });
    if (!verifyResponse.ok) throw new Error("Wallet signature verification failed");
    onVerified(account);
  }

  return (
    <div className="wallet-option">
      <button aria-busy={authenticating} disabled={authenticating} onClick={authenticate} type="button">
        {`Connect ${wallet.name}`}
      </button>
      {error ? <small aria-live="polite" className="error">{error}</small> : null}
    </div>
  );
}

export function WalletConnect() {
  const wallets = useWallets(walletClient);
  const connected = useConnectedWallet(walletClient);
  const disconnect = useDisconnect(walletClient);
  const isWalletReady = useIsWalletReady(walletClient);
  const [connectedAccount, setConnectedAccount] =
    useState<UiWalletAccount | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [userAgent, setUserAgent] = useState("");
  const [taskPurpose, setTaskPurpose] = useState(
    "Research the paid demo source and summarize the finding.",
  );
  const [task, setTask] = useState<{
    id: string;
    paymentAddress: string;
    paymentAta: string;
    mint: string;
    allocation: string;
  } | null>(null);
  const [retryRun, setRetryRun] = useState<{ taskId: string; prompt: string; purchaseRef: string } | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [fundingState, setFundingState] = useState<
    "idle" | "signing" | "confirming" | "confirmed"
  >("idle");
  const [fundingSignature, setFundingSignature] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TaskSnapshotDto & {
    readiness: { ai: boolean; jev: boolean; merchant: boolean; rpc: boolean };
    merchantPreview: null | {
      serviceId: string;
      resourceId: string;
      amount: string;
      mint: string;
      payTo: string;
    };
  } | null>(null);
  const [agentResult, setAgentResult] = useState<AgentRunView | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [purposeError, setPurposeError] = useState<string | null>(null);
  const purposeInput = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const activeWallet = useRef<string | null>(null);
  const activeTask = useRef<string | null>(null);
  const historyVersion = useRef(0);

  useEffect(() => {
    setHydrated(true);
    setUserAgent(window.navigator.userAgent);
  }, []);

  useEffect(() => {
    let cancelled = false;
    activeWallet.current = connected?.account.address ?? null;
    setConnectedAccount(null);
    clearTask();
    setHistory([]);
    setHistoryLoading(false);
    setHistoryError(null);
    if (connected) {
      const account = connected.account;
      fetch("/api/auth/session", { cache: "no-store" }).then(async response => {
        if (!response.ok) return;
        const session = await response.json();
        if (!cancelled && session.address === account.address) setConnectedAccount(account);
      }).catch(() => undefined);
    }
    return () => { cancelled = true; };
  }, [connected?.account.address]);

  useEffect(() => {
    if (!connectedAccount) return;
    void loadHistory(0);
    const restore = () => {
      const id = new URL(window.location.href).searchParams.get("task");
      if (id) void openTask(id, false);
      else clearTask();
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [connectedAccount?.address]);

  function clearTask() {
    activeTask.current = null;
    setTask(null);
    setSnapshot(null);
    setFundingSignature(null);
    setFundingState("idle");
    setAgentResult(null);
    setRetryRun(null);
    setTaskError(null);
    setLoadingTask(false);
  }

  function setTaskUrl(id: string | null) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("task", id);
    else url.searchParams.delete("task");
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
  }

  async function loadHistory(offset = 0) {
    const owner = activeWallet.current;
    const version = ++historyVersion.current;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/tasks?offset=${offset}`, { cache: "no-store" });
      if (response.status === 401) throw new Error("Your session expired. Disconnect and reconnect your wallet.");
      if (!response.ok) throw new Error("Could not load saved tasks. Try again.");
      const result = await response.json();
      if (owner !== activeWallet.current || version !== historyVersion.current) return;
      setHistory(result.tasks);
      setHistoryHasMore(result.hasMore);
      setHistoryOffset(offset);
    } catch (cause) {
      if (owner === activeWallet.current && version === historyVersion.current) setHistoryError(cause instanceof Error ? cause.message : "Could not load tasks.");
    } finally {
      if (owner === activeWallet.current && version === historyVersion.current) setHistoryLoading(false);
    }
  }

  async function openTask(id: string, navigate = true) {
    clearTask();
    activeTask.current = id;
    setLoadingTask(true);
    if (navigate) setTaskUrl(id);
    try {
      await refreshTask(id, true);
    } catch (cause) {
      if (activeTask.current === id) setTaskError(cause instanceof Error ? cause.message : "Could not open task.");
    } finally {
      if (activeTask.current === id) setLoadingTask(false);
    }
  }

  async function refreshTask(taskId: string, restoreFunding = false) {
    const owner = activeWallet.current;
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { cache: "no-store" });
    if (response.status === 401) throw new Error("Your session expired. Disconnect and reconnect your wallet.");
    if (!response.ok) throw new Error("Could not open this task. Check your connection and wallet, then try again.");
    const result = await response.json() as NonNullable<typeof snapshot> & { account: PublicTaskAccount };
    if (owner !== activeWallet.current || activeTask.current !== taskId) return;
    setSnapshot(result);
    setTask(result.account);
    if (restoreFunding || result.account.fundingSignature) {
      const funding = recoverFundingState(result.account, readSubmittedFunding(taskId));
      setFundingState(funding.state);
      setFundingSignature(funding.signature);
    }
  }

  async function refreshSelectedTask() {
    if (!task || refreshing) return;
    const id = task.id;
    setRefreshing(true);
    setTaskError(null);
    try {
      if (fundingState === "confirming" && fundingSignature) {
        const state = await checkFundingConfirmation(id, fundingSignature);
        if (state === "unauthorized") throw new Error("Your session expired. Disconnect and reconnect your wallet.");
        if (state === "rejected") throw new Error("Funding could not be attributed to this task. Check the submitted transfer; do not pay again.");
      }
      await refreshTask(id, true);
      await loadHistory(historyOffset);
    } catch (cause) {
      if (activeTask.current === id) setTaskError(cause instanceof Error ? cause.message : "Could not refresh task.");
    } finally { setRefreshing(false); }
  }

  async function disconnectWallet() {
    setTaskError(null);
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign out failed");
      await disconnect.dispatchAsync();
      setConnectedAccount(null);
      clearTask();
      setTaskUrl(null);
    } catch { setTaskError("Could not disconnect. Please try again."); }
  }

  async function createTask() {
    if (creatingTask) return;
    const purpose = taskPurpose.trim();
    if (purpose.length < 3) {
      setPurposeError("Describe your task in at least 3 characters.");
      purposeInput.current?.focus();
      return;
    }
    setPurposeError(null);
    setCreatingTask(true);
    setTaskError(null);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose,
          serviceId: "research-api",
          resourceId: "research-brief",
          maxAmountBaseUnits: "1000",
          durationMinutes: 45,
        }),
      });
      if (!response.ok) throw new Error("Could not create the task. Please try again.");
      const created = await response.json();
      activeTask.current = created.id;
      setTask(created);
      setTaskUrl(created.id);
      await refreshTask(created.id);
      await loadHistory(0);
    } catch {
      setTaskError("Could not create the task. Check your connection and try again.");
    } finally {
      setCreatingTask(false);
    }
  }

  async function fundTask() {
    if (!task || !connectedAccount || fundingState !== "idle") return;
    setTaskError(null);
    let submittedSignature: string | null = null;
    try {
      setFundingState("signing");
      const transactionResponse = await fetch(
        `/api/tasks/${task.id}/funding-transaction`,
        { method: "POST" },
      );
      if (!transactionResponse.ok) throw new Error("Could not build funding transaction");
      const payload = (await transactionResponse.json()) as { transaction: string };
      const transactionSignature = await sendWalletTransactionBytes(
        base64ToBytes(payload.transaction),
      );
      submittedSignature = transactionSignature;
      rememberSubmittedFunding(task.id, transactionSignature);
      if (activeTask.current !== task.id) return;
      setFundingSignature(transactionSignature);
      setFundingState("confirming");

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const status = await checkFundingConfirmation(task.id, transactionSignature);
        if (activeTask.current !== task.id) return;
        if (status === "confirmed") {
          setFundingState("confirmed");
          await refreshTask(task.id);
          return;
        }
        if (status === "rejected") throw new Error("Funding evidence did not match this task. The submitted transfer needs review; do not send another payment.");
        if (status === "unauthorized") throw new Error("Your session expired. Reconnect your wallet to check the submitted transfer.");
        await new Promise((resolve) => window.setTimeout(resolve, 2_000));
      }
      throw new Error("Transaction submitted; confirmation is still pending");
    } catch (cause) {
      if (activeTask.current === task.id) {
        setTaskError(cause instanceof Error ? cause.message : "Funding failed");
        setFundingState(submittedSignature ? "confirming" : "idle");
      }
    }
  }

  async function runDemo(prompt: string) {
    if (!task || actionPending) return;
    const cleanPrompt = prompt.trim();
    if (retryRun && (retryRun.taskId !== task.id || retryRun.prompt !== cleanPrompt)) {
      setTaskError("Retry the previous instructions first, or refresh the task to inspect the last attempt.");
      return;
    }
    if (!retryRun && agentResult && !window.confirm("Start another agent run? This may request another paid service within the task's permissions.")) return;
    const run = retryRun ?? { taskId: task.id, prompt: cleanPrompt, purchaseRef: `purchase-${crypto.randomUUID()}` };
    setRetryRun(run);
    setActionPending(true);
    setTaskError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: run.prompt,
          purchaseRef: run.purchaseRef,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Agent run failed");
      if (activeTask.current !== run.taskId) return;
      setAgentResult(result as AgentRunView);
      setRetryRun(null);
      await refreshTask(task.id);
    } catch (cause) {
      if (activeTask.current === run.taskId) setTaskError(`${cause instanceof Error ? cause.message : "Agent run failed"}. Retrying the same instructions will reuse the purchase reference.`);
    } finally {
      setActionPending(false);
    }
  }

  async function cancelResearch() {
    if (!task) return;
    if (!window.confirm("Cancel research authority? New research purchases will be blocked. Already submitted payments cannot be reversed.")) return;
    setActionPending(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/cancel`, { method: "POST" });
      if (!response.ok) throw new Error("Could not cancel research authority.");
      await refreshTask(task.id);
    } catch {
      setTaskError("Could not cancel research authority. Refresh the task before trying again.");
    } finally { setActionPending(false); }
  }

  if (connectedAccount) {
    const liveStatus = fundingState === "confirmed"
      ? "Task funding confirmed. The bounded agent can run."
      : fundingState === "confirming"
        ? "Funding transaction submitted and awaiting devnet confirmation."
        : fundingState === "signing"
          ? "Funding transaction is awaiting wallet approval."
          : task
            ? "Task created. Review the funding preview before signing."
            : "Wallet ownership verified. Create a task to continue.";
    return (
      <div className="verified">
        <p aria-live="polite" className="sr-only">{liveStatus}</p>
        <AppProgress
          fundingState={fundingState}
          taskCreated={Boolean(task)}
          walletVerified
        />
        <div className="wallet-session-row">
          <div><strong>Wallet ownership verified</strong><code>{connectedAccount.address}</code></div>
          <button className="secondary" disabled={disconnect.isRunning || fundingState === "signing" || actionPending || creatingTask} onClick={disconnectWallet} type="button">Disconnect</button>
        </div>
        <TaskHistory entries={history} selectedId={task?.id} loading={historyLoading} error={historyError} offset={historyOffset} hasMore={historyHasMore} disabled={actionPending || creatingTask || fundingState === "signing"} onPage={offset => void loadHistory(offset)} onSelect={id => void openTask(id)} onNew={() => { clearTask(); setTaskUrl(null); }} />
        {loadingTask ? <div className="task-loading" aria-live="polite"><span className="task-skeleton" /><span className="task-skeleton" /><p>Opening your saved task…</p></div> : null}
        {!task && !loadingTask ? (
          <form className="task-setup" noValidate onSubmit={(event) => { event.preventDefault(); void createTask(); }}>
            <label htmlFor="task-purpose">What should this task accomplish?</label>
            <textarea
              ref={purposeInput}
              id="task-purpose"
              name="purpose"
              autoComplete="off"
              aria-invalid={Boolean(purposeError)}
              aria-describedby={purposeError ? "task-purpose-help task-purpose-error" : "task-purpose-help"}
              maxLength={240}
              onChange={(event) => setTaskPurpose(event.target.value)}
              onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
              rows={3}
              value={taskPurpose}
            />
            <small id="task-purpose-help">Paid research brief · 0.001 test USDC per purchase · 45-minute window.</small>
            {purposeError ? <span aria-live="polite" className="task-field-error" id="task-purpose-error">{purposeError}</span> : null}
            <button aria-busy={creatingTask} disabled={creatingTask} type="submit">Create 10 test-USDC task</button>
          </form>
        ) : null}
        {task && snapshot ? <TaskDashboard
          key={task.id}
          actionPending={actionPending}
          agentResult={agentResult}
          fundingSignature={fundingSignature}
          fundingState={fundingState}
          onCancel={cancelResearch}
          onFund={fundTask}
          onRefresh={refreshSelectedTask}
          refreshing={refreshing}
          retryPurchaseRef={retryRun?.purchaseRef}
          onRun={runDemo}
          ownerWallet={connectedAccount.address}
          snapshot={snapshot}
          task={task}
        /> : null}
        {taskError ? <div className="task-error" aria-live="polite"><p className="error">{taskError}</p>{activeTask.current && !task ? <button className="secondary" onClick={() => void openTask(activeTask.current as string, false)} type="button">Reopen task</button> : null}</div> : null}
      </div>
    );
  }

  if (shouldRenderWalletLoading({ hydrated, walletReady: isWalletReady })) {
    return <div aria-live="polite" className="wallet-empty"><strong>Checking for Solana wallets…</strong><p>Restoring a previous Wallet Standard connection if available.</p></div>;
  }

  const emptyState = walletEmptyState({ userAgent, walletCount: wallets.length });

  return (
    <div className="wallet-list">
      <p aria-live="polite" className="sr-only">
        {wallets.length === 0 ? "No compatible wallet detected." : `${wallets.length} compatible wallet options detected.`}
      </p>
      <AppProgress
        fundingState="idle"
        taskCreated={false}
        walletVerified={false}
      />
      {wallets.length === 0 ? (
        <div className="wallet-empty">
          <strong>{emptyState.title}</strong>
          <p>{emptyState.kind === "mobile" ? "Open this URL inside Phantom or another Solana wallet browser, then connect again." : "Install or unlock a Wallet Standard wallet such as Phantom or Solflare, then refresh this page."}</p>
          <div className="wallet-recovery-actions">
            <a className="primary-link" href="https://phantom.com/download" rel="noreferrer" target="_blank">Get Phantom <span>↗</span></a>
            <Link className="text-link" href="/demo">Try guided demo →</Link>
          </div>
        </div>
      ) : (
        wallets.map((wallet) => (
          <WalletButton
            key={wallet.name}
            onVerified={setConnectedAccount}
            wallet={wallet}
          />
        ))
      )}
    </div>
  );
}
