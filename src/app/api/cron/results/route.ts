import { NextResponse } from "next/server";
import { syncResultsFeed } from "@/lib/results-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { status: "disabled", error: "Results synchronization is not configured." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncResultsFeed();
    return NextResponse.json({ status: "ok", ...summary });
  } catch (error) {
    console.error("Results synchronization failed", error);
    return NextResponse.json(
      { status: "error", error: "Results synchronization failed." },
      { status: 502 },
    );
  }
}
