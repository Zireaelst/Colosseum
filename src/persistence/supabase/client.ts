import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
