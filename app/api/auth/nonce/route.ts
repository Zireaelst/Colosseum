import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthConfigurationError,
  issueWalletChallenge,
} from "../../../../src/auth/store";

const requestSchema = z.object({ address: z.string().min(32).max(64) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }

  try {
    return NextResponse.json(issueWalletChallenge(parsed.data.address));
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json(
        { error: error.code },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }
}
