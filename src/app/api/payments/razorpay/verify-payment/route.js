import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = await request.json();

    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id parameter" }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if we are running in Sandbox mode with test/mock keys
    const isMock = keyId === "rzp_test_mockkeyid12345" || String(razorpay_order_id).startsWith("order_mock_");

    if (!isMock) {
      // 1. Verify signatures for live mode
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
      }

      const bodyText = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(bodyText)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
      }
    } else {
      console.warn("Bypassing signature validation: Sandbox / Development mode active.");
    }

    const transactionId = razorpay_payment_id || "pay_mock_" + Math.floor(Math.random() * 1000000000);

    // 2. Update order status and payment status in Supabase
    const { error: orderError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        order_status: "processing"
      })
      .eq("id", order_id);

    if (orderError) {
      throw new Error(`Failed to update order status: ${orderError.message}`);
    }

    // 3. Update or Insert payment reference in payments table
    // Try to update existing payment row for this order, or insert if missing
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order_id)
      .maybeSingle();

    if (existingPayment) {
      const { error: payUpdateErr } = await supabase
        .from("payments")
        .update({
          transaction_id: transactionId,
          status: "approved"
        })
        .eq("id", existingPayment.id);

      if (payUpdateErr) {
        console.warn("Payments update warning:", payUpdateErr.message);
      }
    } else {
      // Get the order total amount to record in payments
      const { data: orderData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("id", order_id)
        .single();

      const { error: payInsertErr } = await supabase
        .from("payments")
        .insert({
          order_id: order_id,
          payment_gateway: isMock ? "razorpay_mock" : "razorpay",
          transaction_id: transactionId,
          amount: orderData?.total_amount || 0,
          status: "approved"
        });

      if (payInsertErr) {
        console.warn("Payments insert warning:", payInsertErr.message);
      }
    }

    return NextResponse.json({ success: true, transaction_id: transactionId });

  } catch (error) {
    console.error("Razorpay payment verification error:", error);
    return NextResponse.json({ error: error.message || "Failed to verify Razorpay payment" }, { status: 500 });
  }
}
