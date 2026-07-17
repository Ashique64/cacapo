import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/returns/submit
 *
 * Initiates a return/exchange request for a delivered order.
 * Validates ownership, calculates restocking/return shipping fees,
 * updates the order status, and creates/updates return request metadata.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { order_id, request_type, reason, reason_notes, items, exchange_details, user_id } = body;

    if (!order_id || !request_type || !reason || !items || !user_id) {
      return NextResponse.json(
        { error: "Missing required parameters: order_id, request_type, reason, items, user_id" },
        { status: 400 }
      );
    }

    if (!["return", "exchange"].includes(request_type)) {
      return NextResponse.json(
        { error: "Invalid request_type. Must be 'return' or 'exchange'" },
        { status: 400 }
      );
    }

    if (!["damaged", "defective", "wrong_item", "not_as_described", "size_fit", "changed_mind"].includes(reason)) {
      return NextResponse.json(
        { error: "Invalid reason option provided" },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch order details to verify ownership and delivery eligibility
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, order_status, shipping_address, total_amount, created_at")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.user_id !== user_id) {
      return NextResponse.json({ error: "Unauthorized access to order" }, { status: 403 });
    }

    if (order.order_status !== "delivered") {
      return NextResponse.json({ error: "Only delivered orders are eligible for returns/exchanges" }, { status: 400 });
    }

    // 2. Validate return window
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Damaged/defective/wrong_item must be within 72 hours (3 days)
    if (["damaged", "defective", "wrong_item"].includes(reason) && diffDays > 3) {
      return NextResponse.json(
        { error: "Damaged, defective, or wrong item claims must be reported within 72 hours of receipt" },
        { status: 400 }
      );
    }

    // Others must be within 7 days
    if (diffDays > 7) {
      return NextResponse.json(
        { error: "Returns and exchanges must be requested within 7 days of delivery" },
        { status: 400 }
      );
    }

    // 3. Calculate restocking/shipping fee in paise
    // User requested: "i don't want 500 + return shipping for size / fit issue and also mind change. instead of that charge the shipping return charge 50 rupees"
    // Also user requested: "i need to give 50 fee for Not as described"
    let restockingFee = 0;
    if (["size_fit", "changed_mind", "not_as_described"].includes(reason)) {
      restockingFee = 5000; // ₹50.00 (in paise)
    }

    // Calculate maximum refund amount (total paid minus fee, but at least 0)
    const refundAmount = Math.max(0, order.total_amount - restockingFee);

    const returnRequestData = {
      order_id,
      user_id,
      request_type,
      reason,
      reason_notes: reason_notes || null,
      status: "pending",
      items,
      exchange_details: request_type === "exchange" ? exchange_details : null,
      restocking_fee: restockingFee,
      refund_amount: request_type === "return" ? refundAmount : null,
      evidence_skipped: true, // Default to true until evidence is uploaded
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let returnRequestId = null;
    let fallbackUsed = false;

    // 4. Try inserting into return_requests table (Step 8.5)
    try {
      const { data: dbRequest, error: dbErr } = await supabase
        .from("return_requests")
        .insert({
          order_id,
          user_id,
          request_type,
          reason,
          reason_notes: reason_notes || null,
          status: "pending",
          items,
          exchange_details: request_type === "exchange" ? exchange_details : null,
          restocking_fee: restockingFee,
          refund_amount: request_type === "return" ? refundAmount : null,
          evidence_skipped: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (dbErr) {
        // If table doesn't exist, we fallback
        if (dbErr.code === "P0001" || dbErr.message.includes("does not exist")) {
          fallbackUsed = true;
        } else {
          throw dbErr;
        }
      } else if (dbRequest) {
        returnRequestId = dbRequest.id;
      }
    } catch (e) {
      console.warn("[returns/submit] return_requests table insert failed, attempting fallback:", e.message);
      fallbackUsed = true;
    }

    // Fallback: Save metadata directly to orders.shipping_address
    if (fallbackUsed) {
      returnRequestId = `metadata_${order_id}`;
      const updatedAddress = {
        ...order.shipping_address,
        return_request: {
          ...returnRequestData,
          id: returnRequestId
        }
      };

      const { error: addressUpdateErr } = await supabase
        .from("orders")
        .update({ shipping_address: updatedAddress })
        .eq("id", order_id);

      if (addressUpdateErr) throw addressUpdateErr;
    }

    // 5. Update order status
    const newOrderStatus = request_type === "exchange" ? "exchange_requested" : "return_requested";
    const { error: orderStatusErr } = await supabase
      .from("orders")
      .update({ order_status: newOrderStatus })
      .eq("id", order_id);

    if (orderStatusErr) {
      console.error("[returns/submit] Failed to update order_status:", orderStatusErr.message);
    }

    return NextResponse.json({
      success: true,
      return_request_id: returnRequestId,
      restocking_fee: restockingFee,
      refund_amount: refundAmount,
      fallback: fallbackUsed
    });

  } catch (error) {
    console.error("[returns/submit] Error processing return request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit return request" },
      { status: 500 }
    );
  }
}
