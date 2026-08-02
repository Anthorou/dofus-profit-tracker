import { NextResponse, type NextRequest } from "next/server";

import { searchDofusdudeEquipment } from "@/features/items/dofusdude/client";
import { DofusdudeSearchError } from "@/features/items/dofusdude/types";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHENTICATED",
        message: "Tu dois être connecté pour effectuer une recherche.",
      },
      { status: 401 },
    );
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const items = await searchDofusdudeEquipment(query);

    return NextResponse.json({ success: true, items });
  } catch (error) {
    if (error instanceof DofusdudeSearchError) {
      if (error.code === "INVALID_QUERY") {
        return NextResponse.json(
          { success: false, error: error.code, message: error.message },
          { status: 400 },
        );
      }

      const status = error.code === "INVALID_RESPONSE" ? 502 : 503;

      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: "La recherche d’équipements est temporairement indisponible.",
        },
        { status },
      );
    }

    console.error("Unexpected equipment search error", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Une erreur inattendue est survenue pendant la recherche.",
      },
      { status: 500 },
    );
  }
}
