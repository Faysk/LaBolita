import { NextResponse } from "next/server";
import { recordResultsSyncFailure, syncResultsFeed } from "@/lib/results-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return jsonNoStore(
      { status: "disabled", error: "Results synchronization is not configured." },
      503,
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonNoStore({ status: "unauthorized" }, 401);
  }

  try {
    const summary = await syncResultsFeed();
    return jsonNoStore({ status: "ok", ...summary });
  } catch (error) {
    console.error("Results synchronization failed", error);
    await recordResultsSyncFailure(error);
    return jsonNoStore({ status: "error", error: "Results synchronization failed." }, 502);
  }
}

function jsonNoStore(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
