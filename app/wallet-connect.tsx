"use client";

import { useState } from "react";
import { getBase58Decoder } from "@solana/kit";
import {
  getWalletAccountFeature,
  type UiWallet,
  type UiWalletAccount,
  useConnect,
  useWallets,
} from "@wallet-standard/react";
import { getWalletAccountForUiWalletAccount } from "@wallet-standard/ui-registry";

import { TaskDashboard, type AgentRunView } from "./components/task-dashboard";
import type { TaskSnapshotDto } from "../src/ui/task-view-model";

interface SignMessageFeature {
  signMessage(...inputs: readonly {
    account: ReturnType<typeof getWalletAccountForUiWalletAccount>;
    message: Uint8Array;
  }[]): Promise<readonly { signature: Uint8Array }[]>;
}

interface SignAndSendTransactionFeature {
  signAndSendTransaction(...inputs: readonly {
    account: ReturnType<typeof getWalletAccountForUiWalletAccount>;
    chain: "solana:devnet";
    transaction: Uint8Array;
    options?: { preflightCommitment?: "confirmed" };
  }[]): Promise<readonly { signature: Uint8Array }[]>;
}

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
  const [isConnecting, connect] = useConnect(wallet);
  const [error, setError] = useState<string | null>(null);

  async function authenticate() {
    setError(null);
    try {
      const accounts = await connect();
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
    if (!account.features.includes("solana:signMessage")) {
      throw new Error("Wallet does not support solana:signMessage");
    }
    const challengeResponse = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: account.address }),
    });
    if (!challengeResponse.ok) throw new Error("Could not create wallet nonce");
    const challenge = (await challengeResponse.json()) as { message: string };
    const standardAccount = getWalletAccountForUiWalletAccount(account);
    const feature = getWalletAccountFeature(
      account,
      "solana:signMessage",
    ) as SignMessageFeature;
    const [signed] = await feature.signMessage({
      account: standardAccount,
      message: new TextEncoder().encode(challenge.message),
    });
    if (!signed) throw new Error("Wallet returned no signature");

    const verifyResponse = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address: account.address,
        message: challenge.message,
        signature: bytesToBase64(signed.signature),
      }),
    });
    if (!verifyResponse.ok) throw new Error("Wallet signature verification failed");
    onVerified(account);
  }

  return (
    <div className="wallet-option">
      <button disabled={isConnecting} onClick={authenticate} type="button">
        {isConnecting ? "Connecting…" : `Connect ${wallet.name}`}
      </button>
      {error ? <small className="error">{error}</small> : null}
    </div>
  );
}

export function WalletConnect() {
  const wallets = useWallets();
  const [connectedAccount, setConnectedAccount] =
    useState<UiWalletAccount | null>(null);
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
      amount: string;
      mint: string;
      payTo: string;
    };
  } | null>(null);
  const [agentResult, setAgentResult] = useState<AgentRunView | null>(null);
  const [actionPending, setActionPending] = useState(false);

  async function refreshTask(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`);
    if (response.ok) setSnapshot(await response.json());
  }

  async function createTask() {
    setTaskError(null);
    const response = await fetch("/api/tasks", { method: "POST" });
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
      if (!connectedAccount.features.includes("solana:signAndSendTransaction")) {
        throw new Error("Wallet does not support solana:signAndSendTransaction");
      }
      setFundingState("signing");
      const transactionResponse = await fetch(
        `/api/tasks/${task.id}/funding-transaction`,
        { method: "POST" },
      );
      if (!transactionResponse.ok) throw new Error("Could not build funding transaction");
      const payload = (await transactionResponse.json()) as { transaction: string };
      const feature = getWalletAccountFeature(
        connectedAccount,
        "solana:signAndSendTransaction",
      ) as SignAndSendTransactionFeature;
      const [sent] = await feature.signAndSendTransaction({
        account: getWalletAccountForUiWalletAccount(connectedAccount),
        chain: "solana:devnet",
        transaction: base64ToBytes(payload.transaction),
        options: { preflightCommitment: "confirmed" },
      });
      if (!sent) throw new Error("Wallet returned no transaction signature");
      const transactionSignature = getBase58Decoder().decode(sent.signature);
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
          purchaseKey: `demo-${crypto.randomUUID()}`,
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
        <strong>Wallet ownership verified</strong>
        <code>{connectedAccount.address}</code>
        {!task ? (
          <button onClick={createTask} type="button">Create 10 test-USDC task</button>
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

  return (
    <div className="wallet-list">
      {wallets.length === 0 ? (
        <p>No Wallet Standard wallet detected. Install or unlock a Solana wallet.</p>
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
