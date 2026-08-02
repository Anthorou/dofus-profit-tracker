import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const next = requestedNext === "/reset-password" ? requestedNext : null;
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next ?? "/dashboard", request.url));
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const destination =
        next ?? (type === "recovery" ? "/reset-password" : "/dashboard");
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "message",
    "Le lien de confirmation ou de récupération est invalide ou expiré.",
  );
  return NextResponse.redirect(loginUrl);
}
