import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log("Received Razorpay Webhook Event:", payload.event);

    if (payload.event === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      const amount = paymentEntity.amount; // in paise

      if (!razorpayOrderId) {
        return NextResponse.json({ message: "No order associated with payment" }, { status: 200 });
      }

      // 1. Look up the payment record by Razorpay Order ID
      const { data: paymentRow, error: payFindErr } = await supabase
        .from("payments")
        .select("id, order_id, status")
        .eq("transaction_id", razorpayOrderId)
        .maybeSingle();

      if (payFindErr) {
        console.error("Webhook payment lookup error:", payFindErr.message);
        return NextResponse.json({ error: "DB lookup error" }, { status: 500 });
      }

      if (paymentRow) {
        // If not already marked approved/paid
        if (paymentRow.status !== "approved") {
          // Update order status to PAID and PROCESSING
          const { error: orderUpdateErr } = await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              order_status: "processing"
            })
            .eq("id", paymentRow.order_id);

          if (orderUpdateErr) {
            console.error("Webhook order update error:", orderUpdateErr.message);
          }

          // Update payment status and transaction ID to the actual payment ID
          const { error: payUpdateErr } = await supabase
            .from("payments")
            .update({
              transaction_id: razorpayPaymentId,
              status: "approved"
            })
            .eq("id", paymentRow.id);

          if (payUpdateErr) {
            console.error("Webhook payment update error:", payUpdateErr.message);
          }

          console.log(`Webhook updated Order ID ${paymentRow.order_id} to PAID via webhook.`);
        }
      } else {
        console.log(`No pending payment found for Razorpay Order ID: ${razorpayOrderId}.`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: error.message || "Failed to process webhook" }, { status: 500 });
  }
}
