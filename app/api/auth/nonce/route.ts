import { NextResponse } from "next/server";
import { z } from "zod";

import { walletNonceStore } from "../../../../src/auth/store";

const requestSchema = z.object({ address: z.string().min(32).max(64) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }

  try {
    return NextResponse.json(walletNonceStore.issue(parsed.data.address));
  } catch {
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }
}
