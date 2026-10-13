import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createWalletSession,
  walletNonceStore,
} from "../../../../src/auth/store";

const requestSchema = z.object({
  address: z.string().min(32).max(64),
  message: z.string().min(1).max(2_000),
  signature: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const result = walletNonceStore.verify(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.code }, { status: 401 });
    }
    const response = NextResponse.json({
      verified: true,
      address: parsed.data.address,
    });
    response.cookies.set("pactlet_session", createWalletSession(parsed.data.address), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 60,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }
}
