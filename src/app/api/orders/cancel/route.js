import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/orders/cancel
 *
 * Cancels an order securely from the server side. Restores stock quantities
 * for order items, updates order_status to 'cancelled', and bypasses RLS.
 */
export async function POST(request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch order and its items
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Safety check: Only allow cancelling if order is not already shipped, delivered or cancelled
    const cannotCancel = ["shipped", "delivered", "cancelled"].includes(order.order_status);
    if (cannotCancel) {
      return NextResponse.json(
        { error: `Cannot cancel an order that is already ${order.order_status}` },
        { status: 400 }
      );
    }

    // 3. Restock items back to inventory
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        if (item.variant_id) {
          const { data: variant } = await supabase
            .from("product_variants")
            .select("stock_quantity")
            .eq("id", item.variant_id)
            .maybeSingle();

          if (variant) {
            await supabase
              .from("product_variants")
              .update({ stock_quantity: (variant.stock_quantity || 0) + item.quantity })
              .eq("id", item.variant_id);

            // Log stock management change
            try {
              await supabase
                .from("inventory_logs")
                .insert({
                  product_id: item.product_id,
                  variant_id: item.variant_id,
                  quantity_change: item.quantity,
                  reason: `Restocked from cancelled order #${order.order_number}`
                });
            } catch (err) {
              console.warn("Could not log variant to inventory_logs:", err.message);
            }
          }
        } else if (item.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .maybeSingle();

          if (product) {
            await supabase
              .from("products")
              .update({ stock_quantity: (product.stock_quantity || 0) + item.quantity })
              .eq("id", item.product_id);

            // Log stock management change
            try {
              await supabase
                .from("inventory_logs")
                .insert({
                  product_id: item.product_id,
                  variant_id: null,
                  quantity_change: item.quantity,
                  reason: `Restocked from cancelled order #${order.order_number}`
                });
            } catch (err) {
              console.warn("Could not log product to inventory_logs:", err.message);
            }
          }
        }
      }
    }

    // 4. Update order status to 'cancelled'
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ order_status: "cancelled" })
      .eq("id", orderId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[cancel-order-api] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel order" },
      { status: 500 }
    );
  }
}
