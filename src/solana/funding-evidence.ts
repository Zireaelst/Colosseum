interface FundingEvidenceInput {
  signature: string;
  sourceOwner: string;
  sourceAta: string;
  destinationAta: string;
  mint: string;
  amount: bigint;
  decimals: number;
  transaction: unknown;
}

interface ParsedTokenBalance {
  accountIndex: number;
  mint: string;
  amount: bigint;
  decimals: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTokenBalances(value: unknown): ParsedTokenBalance[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: ParsedTokenBalance[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate) || !isRecord(candidate.uiTokenAmount)) return null;
    const { accountIndex, mint, uiTokenAmount } = candidate;
    const { amount, decimals } = uiTokenAmount;
    if (
      !Number.isSafeInteger(accountIndex) ||
      typeof accountIndex !== "number" ||
      accountIndex < 0 ||
      typeof mint !== "string" ||
      typeof amount !== "string" ||
      !/^[0-9]+$/.test(amount) ||
      typeof decimals !== "number" ||
      !Number.isSafeInteger(decimals) ||
      decimals < 0
    ) {
      return null;
    }
    parsed.push({
      accountIndex,
      mint,
      amount: BigInt(amount),
      decimals,
    });
  }
  return parsed;
}

function balanceAt(
  balances: ParsedTokenBalance[],
  accountIndex: number,
  mint: string,
  decimals: number,
  allowMissing: boolean,
): bigint | null {
  const matches = balances.filter(
    (balance) => balance.accountIndex === accountIndex,
  );
  if (matches.length === 0) return allowMissing ? 0n : null;
  if (matches.length !== 1) return null;
  const [balance] = matches;
  if (balance.mint !== mint || balance.decimals !== decimals) return null;
  return balance.amount;
}

export function verifyFundingEvidence(input: FundingEvidenceInput): boolean {
  if (
    input.amount <= 0n ||
    !Number.isSafeInteger(input.decimals) ||
    input.decimals < 0 ||
    !isRecord(input.transaction)
  ) {
    return false;
  }

  const meta = input.transaction.meta;
  const transaction = input.transaction.transaction;
  if (!isRecord(meta) || meta.err !== null || !isRecord(transaction)) {
    return false;
  }
  if (
    !Array.isArray(transaction.signatures) ||
    transaction.signatures[0] !== input.signature ||
    !isRecord(transaction.message) ||
    !Array.isArray(transaction.message.accountKeys)
  ) {
    return false;
  }

  const accountKeys = transaction.message.accountKeys;
  const payer = accountKeys[0];
  if (
    !isRecord(payer) ||
    payer.pubkey !== input.sourceOwner ||
    payer.signer !== true
  ) {
    return false;
  }
  const sourceIndex = accountKeys.findIndex(
    (candidate) => isRecord(candidate) && candidate.pubkey === input.sourceAta,
  );
  const destinationIndex = accountKeys.findIndex(
    (candidate) =>
      isRecord(candidate) && candidate.pubkey === input.destinationAta,
  );
  if (
    sourceIndex < 0 ||
    destinationIndex < 0 ||
    sourceIndex === destinationIndex
  ) {
    return false;
  }

  const preBalances = parseTokenBalances(meta.preTokenBalances);
  const postBalances = parseTokenBalances(meta.postTokenBalances);
  if (!preBalances || !postBalances) return false;

  const sourceBefore = balanceAt(
    preBalances,
    sourceIndex,
    input.mint,
    input.decimals,
    false,
  );
  const sourceAfter = balanceAt(
    postBalances,
    sourceIndex,
    input.mint,
    input.decimals,
    false,
  );
  const destinationBefore = balanceAt(
    preBalances,
    destinationIndex,
    input.mint,
    input.decimals,
    true,
  );
  const destinationAfter = balanceAt(
    postBalances,
    destinationIndex,
    input.mint,
    input.decimals,
    false,
  );
  if (
    sourceBefore === null ||
    sourceAfter === null ||
    destinationBefore === null ||
    destinationAfter === null
  ) {
    return false;
  }

  return (
    sourceBefore - sourceAfter === input.amount &&
    destinationAfter - destinationBefore === input.amount
  );
}
