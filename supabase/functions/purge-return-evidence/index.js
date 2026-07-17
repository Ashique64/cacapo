import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment credentials: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Calculate cutoff time (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString();

    // 2. Query requests marked 'completed' 30 days ago that have evidence not yet purged
    const { data: requests, error: queryErr } = await supabase
      .from("return_requests")
      .select("id, evidence_urls")
      .eq("status", "completed")
      .lte("completed_at", cutoffStr)
      .is("evidence_purged_at", null);

    if (queryErr) throw queryErr;

    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No completed return request evidence files ready for auto-purging.", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const bucketName = "return-evidence";
    let filesDeleted = 0;
    const processedIds = [];

    // 3. Batch delete files from Supabase Storage and mark rows as purged
    for (const request of requests) {
      const paths = request.evidence_urls || [];
      
      if (paths.length > 0) {
        const { error: removeErr } = await supabase.storage
          .from(bucketName)
          .remove(paths);

        if (removeErr) {
          console.error(`[purge-return-evidence] Failed to remove storage files for request ${request.id}:`, removeErr.message);
          continue;
        }

        filesDeleted += paths.length;
      }

      // Update request columns to clear URLs and log purged timestamp
      const { error: updateErr } = await supabase
        .from("return_requests")
        .update({
          evidence_urls: [],
          evidence_skipped: true, // Set to true as no files are left
          evidence_purged_at: new Date().toISOString()
        })
        .eq("id", request.id);

      if (updateErr) {
        console.error(`[purge-return-evidence] Failed to update request record ${request.id}:`, updateErr.message);
      } else {
        processedIds.push(request.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully purged evidence files for completed return claims.`,
        filesDeleted,
        requestsProcessed: processedIds.length,
        purgedRequestIds: processedIds
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("[purge-return-evidence] Auto-purge execution crash:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 550 }
    );
  }
});
