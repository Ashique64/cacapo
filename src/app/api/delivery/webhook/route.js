import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    // 1. Verify Webhook Token/Secret
    const incomingSecret = request.headers.get("x-shiprocket-secret") || request.headers.get("authorization");
    const configuredSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;

    if (configuredSecret && incomingSecret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    console.log("Received Shiprocket Tracking Webhook:", payload);

    // Shiprocket payloads typically contain:
    // - awb: Air Waybill tracking number
    // - current_status: status string (e.g., 'picked_up', 'delivered', 'rto_delivered')
    // - shipment_id: Shiprocket internal shipment ID
    // - status_code: code representing state
    const { awb, current_status, shipment_id } = payload;

    if (!awb && !shipment_id) {
      return NextResponse.json({ error: "Missing tracking keys" }, { status: 400 });
    }

    const statusClean = (current_status || "").toLowerCase().trim();

    // 2. Resolve target order in Supabase
    // Try to find the order by forward shipment_id or tracking_number (awb) first
    let query = supabase.from("orders").select("*");
    if (shipment_id) {
      query = query.eq("shipment_id", shipment_id.toString());
    } else {
      query = query.eq("tracking_number", awb);
    }

    const { data: forwardOrder, error: forwardErr } = await query.maybeSingle();

    if (forwardErr) {
      console.error("Supabase query error resolving order:", forwardErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (forwardOrder) {
      // Handle forward tracking status update
      let nextStatus = null;
      if (["picked_up", "in_transit", "out_for_delivery", "shipped"].includes(statusClean)) {
        nextStatus = "shipped";
      } else if (["delivered"].includes(statusClean)) {
        nextStatus = "delivered";
      }

      if (nextStatus && forwardOrder.order_status !== nextStatus) {
        const { error: updateErr } = await supabase
          .from("orders")
          .update({ order_status: nextStatus })
          .eq("id", forwardOrder.id);

        if (updateErr) throw updateErr;
        console.log(`Updated Order ${forwardOrder.order_number} status to ${nextStatus}`);
      }

      return NextResponse.json({ success: true, type: "forward", order_id: forwardOrder.id });
    }

    // 3. Resolve reverse return request if forward order wasn't found
    // Find order where return_request's return_shipment_id matches
    const { data: allOrders, error: allOrdersErr } = await supabase
      .from("orders")
      .select("*");

    if (allOrdersErr) {
      console.error("Failed to query orders for reverse lookup:", allOrdersErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const targetReturnOrder = allOrders?.find(o => {
      const returnRequest = o.shipping_address?.return_request;
      if (!returnRequest) return false;
      const rId = returnRequest.return_shipment_id?.toString();
      const payloadId = shipment_id?.toString();
      return rId && payloadId && rId === payloadId;
    });

    if (targetReturnOrder) {
      const returnRequest = targetReturnOrder.shipping_address.return_request;
      
      // When reverse shipment is returned/delivered back to our warehouse
      if (["delivered_to_shipper", "returned", "rto_delivered", "delivered"].includes(statusClean)) {
        if (returnRequest.status !== "received" && returnRequest.status !== "approved") {
          const updatedRequest = {
            ...returnRequest,
            status: "received",
            received_at: new Date().toISOString()
          };
          const updatedAddress = {
            ...targetReturnOrder.shipping_address,
            return_request: updatedRequest
          };

          const { error: updateErr } = await supabase
            .from("orders")
            .update({ shipping_address: updatedAddress })
            .eq("id", targetReturnOrder.id);

          if (updateErr) throw updateErr;
          console.log(`Updated return request on Order ${targetReturnOrder.order_number} to RECEIVED`);
        }
      }

      return NextResponse.json({ success: true, type: "reverse", order_id: targetReturnOrder.id });
    }

    return NextResponse.json({ message: "No matching forward or return order found" }, { status: 200 });

  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
