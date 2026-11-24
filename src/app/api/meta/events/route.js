/**
 * POST /api/meta/events
 * Internal endpoint called from server-side checkout flows to fire CAPI events.
 * NOT meant to be called from the browser directly.
 */
import { NextResponse } from "next/server";
import { sendCAPIEvents } from "@/lib/metaCAPI";

export async function POST(request) {
  try {
    const body = await request.json();
    const { event_name, event_id, user_data, custom_data, event_source_url } = body;

    if (!event_name || !event_id) {
      return NextResponse.json({ error: "Missing event_name or event_id" }, { status: 400 });
    }

    await sendCAPIEvents([{ event_name, event_id, user_data, custom_data, event_source_url }]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/meta/events] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
