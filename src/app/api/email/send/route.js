import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sendNotificationEmail } from "@/lib/email";

/**
 * POST /api/email/send
 *
 * Sends transactional email notifications (order_confirmation, shipping_update, return_status).
 */
export async function POST(request) {
  // Rate limit: 20 emails per IP per 10 minutes
  const limited = rateLimit(getClientIp(request), "email:send", {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { type, to, data } = await request.json();

    if (!type || !to || !data) {
      return NextResponse.json(
        { error: "Missing required parameters: type, to, data" },
        { status: 400 }
      );
    }

    if (!["order_confirmation", "shipping_update", "return_status"].includes(type)) {
      return NextResponse.json(
        { error: `Invalid notification type: '${type}'` },
        { status: 400 }
      );
    }

    const result = await sendNotificationEmail({ type, to, data });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[api/email/send] Error delivering email notification:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email notification" },
      { status: 500 }
    );
  }
}
