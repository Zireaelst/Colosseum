import {
  createClient,
  getBase58Decoder,
  getTransactionDecoder,
  isTransactionSendingSigner,
} from "@solana/kit";
import type { ReadonlyUint8Array } from "@solana/kit";
import { walletSigner } from "@solana/kit-plugin-wallet";

export const walletClient = createClient().use(
  walletSigner({ chain: "solana:devnet" }),
);

export async function signWalletMessage(message: Uint8Array): Promise<Uint8Array> {
  return walletClient.wallet.signMessage(message);
}

export function decodeWalletTransactionBytes(transactionBytes: ReadonlyUint8Array) {
  return getTransactionDecoder().decode(transactionBytes);
}

export async function sendWalletTransactionBytes(
  transactionBytes: Uint8Array,
): Promise<string> {
  const signer = walletClient.wallet.getState().connected?.signer;
  if (!signer || !isTransactionSendingSigner(signer)) {
    throw new Error("Wallet does not support signing and sending transactions");
  }
  const transaction = decodeWalletTransactionBytes(transactionBytes);
  const [signature] = await signer.signAndSendTransactions([transaction]);
  if (!signature) throw new Error("Wallet returned no transaction signature");
  return getBase58Decoder().decode(signature);
}

export type { UiWallet, UiWalletAccount } from "@wallet-standard/ui";
