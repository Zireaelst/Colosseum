import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEVNET_USDC_MINT, SOLANA_DEVNET_NETWORK } from "../../policy/payment-terms";
import { TASK_HISTORY_PAGE_SIZE } from "../../ui/task-history";

export interface TaskAccountDatabaseRow {
  id: string;
  owner_wallet: string;
  network: string;
  mint: string;
  allocation_units: string;
  payment_address: string;
  payment_ata: string;
  funding_signature: string | null;
  signer_algorithm: "aes-256-gcm";
  signer_iv: string;
  signer_ciphertext: string;
  signer_authentication_tag: string;
  created_at_ms: number;
}

export interface SupabaseTaskAccountGateway {
  listTaskAccounts(ownerWallet: string, offset: number): Promise<Array<Pick<TaskAccountDatabaseRow, "id" | "payment_address" | "funding_signature">>>;
  insertTaskAccount(row: TaskAccountDatabaseRow): Promise<void>;
  findTaskAccount(id: string): Promise<TaskAccountDatabaseRow | null>;
  markTaskFunded(id: string, signature: string): Promise<boolean>;
}

export function createPactletSupabaseClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "pactlet-server" } },
  });
}

export class SupabaseGateway implements SupabaseTaskAccountGateway {
  constructor(private readonly client: SupabaseClient) {}

  async listTaskAccounts(ownerWallet: string, offset: number) {
    const { data, error } = await this.client.from("task_accounts")
      .select("id,payment_address,funding_signature")
      .eq("owner_wallet", ownerWallet)
      .eq("network", SOLANA_DEVNET_NETWORK)
      .eq("mint", DEVNET_USDC_MINT)
      .order("created_at_ms", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + TASK_HISTORY_PAGE_SIZE);
    if (error) throw new Error("Task history lookup failed");
    return (data ?? []) as Array<Pick<TaskAccountDatabaseRow, "id" | "payment_address" | "funding_signature">>;
  }

  async insertTaskAccount(row: TaskAccountDatabaseRow): Promise<void> {
    const { error } = await this.client.from("task_accounts").insert(row);
    if (error) throw new Error("Task account persistence failed");
  }

  async findTaskAccount(id: string): Promise<TaskAccountDatabaseRow | null> {
    const { data, error } = await this.client
      .from("task_accounts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Task account lookup failed");
    return data as TaskAccountDatabaseRow | null;
  }

  async markTaskFunded(id: string, signature: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("mark_task_funded", {
      p_task_id: id,
      p_funding_signature: signature,
    });
    if (error) throw new Error("Task funding persistence failed");
    return data === true;
  }
}
