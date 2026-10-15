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
import type { TaskSnapshotDto } from "../src/ui/task-view-model";
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

  useEffect(() => {
    setHydrated(true);
    setUserAgent(window.navigator.userAgent);
  }, []);

  useEffect(() => {
    if (!connected || connected.account.address !== connectedAccount?.address) {
      setConnectedAccount(null);
    }
  }, [connected, connectedAccount?.address]);

  async function refreshTask(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`);
    if (response.ok) setSnapshot(await response.json());
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
      setTask(created);
      await refreshTask(created.id);
    } catch {
      setTaskError("Could not create the task. Check your connection and try again.");
    } finally {
      setCreatingTask(false);
    }
  }

  async function fundTask() {
    if (!task || !connectedAccount) return;
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
      setFundingSignature(transactionSignature);
      setFundingState("confirming");

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const statusResponse = await fetch(`/api/tasks/${task.id}/funding-status`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signature: transactionSignature }),
        });
        if (statusResponse.ok) {
          setFundingState("confirmed");
          await refreshTask(task.id);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2_000));
      }
      throw new Error("Transaction submitted; confirmation is still pending");
    } catch (cause) {
      setTaskError(cause instanceof Error ? cause.message : "Funding failed");
      setFundingState(submittedSignature ? "confirming" : "idle");
    }
  }

  async function runDemo(prompt: string) {
    if (!task) return;
    setActionPending(true);
    setTaskError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          purchaseRef: `purchase-${crypto.randomUUID()}`,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Agent run failed");
      setAgentResult(result as AgentRunView);
      await refreshTask(task.id);
    } catch (cause) {
      setTaskError(cause instanceof Error ? cause.message : "Agent run failed");
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
          <button className="secondary" disabled={disconnect.isRunning} onClick={() => disconnect.dispatch()} type="button">Disconnect</button>
        </div>
        {!task ? (
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
          actionPending={actionPending}
          agentResult={agentResult}
          fundingSignature={fundingSignature}
          fundingState={fundingState}
          onCancel={cancelResearch}
          onFund={fundTask}
          onRun={runDemo}
          ownerWallet={connectedAccount.address}
          snapshot={snapshot}
          task={task}
        /> : null}
        {taskError ? <small aria-live="polite" className="error">{taskError}</small> : null}
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
