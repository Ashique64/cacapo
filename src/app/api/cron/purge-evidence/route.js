import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/cron/purge-evidence
 *
 * Daily Cron job that deletes unboxing photos & videos from private storage
 * 30 days after return requests are marked completed.
 */
export async function GET(request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString();
    const bucketName = "return-evidence";

    let filesDeletedCount = 0;
    let requestsProcessedCount = 0;
    const processedIds = [];

    // A. Clean custom return_requests table (Step 8.5 schema)
    try {
      const { data: requests, error: queryErr } = await supabase
        .from("return_requests")
        .select("id, evidence_urls")
        .eq("status", "completed")
        .lte("completed_at", cutoffStr)
        .is("evidence_purged_at", null);

      if (!queryErr && requests && requests.length > 0) {
        for (const req of requests) {
          const urls = req.evidence_urls || [];
          if (urls.length > 0) {
            const { error: removeErr } = await supabase.storage
              .from(bucketName)
              .remove(urls);

            if (!removeErr) {
              filesDeletedCount += urls.length;
            } else {
              console.error(`[cron/purge-evidence] Storage remove error for request ${req.id}:`, removeErr.message);
            }
          }

          const { error: updateErr } = await supabase
            .from("return_requests")
            .update({
              evidence_urls: [],
              evidence_skipped: true,
              evidence_purged_at: new Date().toISOString()
            })
            .eq("id", req.id);

          if (!updateErr) {
            processedIds.push(req.id);
            requestsProcessedCount++;
          }
        }
      }
    } catch (dbErr) {
      console.warn("[cron/purge-evidence] return_requests table check skipped:", dbErr.message);
    }

    // B. Clean fallback orders metadata (Step 8.6 fallback schema)
    try {
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("id, shipping_address");

      if (!ordersErr && orders) {
        const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

        for (const order of orders) {
          const rr = order.shipping_address?.return_request;
          if (rr && rr.status === "completed" && rr.completed_at && !rr.evidence_purged_at) {
            const completedAtMs = new Date(rr.completed_at).getTime();
            if (completedAtMs <= thirtyDaysAgoMs) {
              const urls = rr.evidence_urls || [];
              if (urls.length > 0) {
                const { error: removeErr } = await supabase.storage
                  .from(bucketName)
                  .remove(urls);

                if (!removeErr) {
                  filesDeletedCount += urls.length;
                }
              }

              const updatedAddress = {
                ...order.shipping_address,
                return_request: {
                  ...rr,
                  evidence_urls: [],
                  evidence_skipped: true,
                  evidence_purged_at: new Date().toISOString()
                }
              };

              const { error: orderUpdateErr } = await supabase
                .from("orders")
                .update({ shipping_address: updatedAddress })
                .eq("id", order.id);

              if (!orderUpdateErr) {
                processedIds.push(`metadata_${order.id}`);
                requestsProcessedCount++;
              }
            }
          }
        }
      }
    } catch (fallbackErr) {
      console.warn("[cron/purge-evidence] Fallback orders metadata check skipped:", fallbackErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Completed auto-purge cron run.`,
      filesDeleted: filesDeletedCount,
      requestsProcessed: requestsProcessedCount,
      purgedRequestIds: processedIds
    });

  } catch (error) {
    console.error("[cron/purge-evidence] Cron execution error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute auto-purge cron job" },
      { status: 500 }
    );
  }
}
