"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import type { TaskSnapshotDto } from "../src/ui/task-view-model";
import { walletEmptyState } from "../src/solana/wallet-ui-state";

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

  async function authenticate() {
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
      <button disabled={connect.isRunning} onClick={authenticate} type="button">
        {connect.isRunning ? "Connecting…" : `Connect ${wallet.name}`}
      </button>
      {error ? <small className="error">{error}</small> : null}
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

  useEffect(() => {
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
    setTaskError(null);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        purpose: taskPurpose,
        serviceId: "research-api",
        resourceId: "research-brief",
        maxAmountBaseUnits: "1000",
        durationMinutes: 45,
      }),
    });
    if (!response.ok) {
      setTaskError("Could not create the disposable task account");
      return;
    }
    const created = await response.json();
    setTask(created);
    await refreshTask(created.id);
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
    setActionPending(true);
    const response = await fetch(`/api/tasks/${task.id}/cancel`, { method: "POST" });
    if (!response.ok) setTaskError("Research delegation is already cancelled");
    await refreshTask(task.id);
    setActionPending(false);
  }

  if (connectedAccount) {
    return (
      <div className="verified">
        <div className="wallet-session-row">
          <div><strong>Wallet ownership verified</strong><code>{connectedAccount.address}</code></div>
          <button className="secondary" disabled={disconnect.isRunning} onClick={() => disconnect.dispatch()} type="button">Disconnect</button>
        </div>
        {!task ? (
          <div className="task-setup">
            <label htmlFor="task-purpose">What should this task accomplish?</label>
            <textarea
              id="task-purpose"
              maxLength={240}
              onChange={(event) => setTaskPurpose(event.target.value)}
              rows={3}
              value={taskPurpose}
            />
            <small>Allowed product: paid research brief · max 0.001 test USDC per purchase · expires in 45 minutes.</small>
            <button disabled={taskPurpose.trim().length < 3} onClick={createTask} type="button">Create 10 test-USDC task</button>
          </div>
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
        {taskError ? <small className="error">{taskError}</small> : null}
      </div>
    );
  }

  if (!isWalletReady) {
    return <div className="wallet-empty"><strong>Checking for Solana wallets…</strong><p>Restoring a previous Wallet Standard connection if available.</p></div>;
  }

  const emptyState = walletEmptyState({ userAgent, walletCount: wallets.length });

  return (
    <div className="wallet-list">
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
