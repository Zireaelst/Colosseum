import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { walletForSession } from "../../../../src/auth/store";

const headers = { "cache-control": "private, no-store" };

export async function GET(request: NextRequest) {
  const address = walletForSession(request.cookies.get("pactlet_session")?.value);
  return address
    ? NextResponse.json({ address }, { headers })
    : NextResponse.json({ error: "WALLET_AUTH_REQUIRED" }, { status: 401, headers });
}

export async function DELETE() {
  const response = NextResponse.json({ signedOut: true }, { headers });
  response.cookies.set("pactlet_session", "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
