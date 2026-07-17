import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import exifr from "exifr";

/**
 * POST /api/returns/upload-evidence
 *
 * Receives multipart/form-data containing:
 * - return_request_id (string)
 * - files (one or more File objects)
 *
 * Performs EXIF validation, uploads to the private "return-evidence" bucket,
 * and updates the return request record with evidence paths and metadata flags.
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const returnRequestId = formData.get("return_request_id");
    const files = formData.getAll("files");
    const userId = formData.get("user_id");

    if (!returnRequestId || !files || files.length === 0) {
      return NextResponse.json(
        { error: "Missing return_request_id or files" },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Resolve order details to verify creation date for EXIF comparison and authorize upload
    let orderId = null;
    let orderCreatedAt = null;
    let orderUserId = null;
    let fallbackUsed = returnRequestId.startsWith("metadata_");

    if (fallbackUsed) {
      orderId = returnRequestId.replace("metadata_", "");
    } else {
      // Look up request in return_requests
      const { data: dbReq, error: dbReqErr } = await supabase
        .from("return_requests")
        .select("order_id, user_id")
        .eq("id", returnRequestId)
        .maybeSingle();

      if (dbReq && !dbReqErr) {
        orderId = dbReq.order_id;
        orderUserId = dbReq.user_id;
      }
    }

    if (orderId) {
      const { data: dbOrder } = await supabase
        .from("orders")
        .select("created_at, user_id")
        .eq("id", orderId)
        .maybeSingle();
      if (dbOrder) {
        orderCreatedAt = dbOrder.created_at;
        if (!orderUserId) {
          orderUserId = dbOrder.user_id;
        }
      }
    }

    // Authenticate: only the owning user (or an admin) may upload
    if (userId && orderUserId && orderUserId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: You are not permitted to upload evidence for this request." },
        { status: 403 }
      );
    }

    const orderDate = orderCreatedAt ? new Date(orderCreatedAt) : new Date();

    // 2. Ensure Supabase Storage bucket exists
    const bucketName = "return-evidence";
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === bucketName);
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "video/quicktime",
            "video/webm"
          ]
        });
      }
    } catch (bucketErr) {
      console.warn("[upload-evidence] List/Create bucket warning:", bucketErr.message);
    }

    const uploadedPaths = [];
    let fraudFlag = false;
    let fraudNotes = "";
    let metadataNotes = "";

    // 3. Process each file
    for (const file of files) {
      // Validate size limit: 2MB for images, 50MB for videos
      const sizeLimit = file.type.startsWith("image/") ? 2097152 : 52428800;
      const sizeLimitLabel = file.type.startsWith("image/") ? "2MB" : "50MB";
      if (file.size > sizeLimit) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds the maximum size limit of ${sizeLimitLabel}` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // Image EXIF date checks for fraud prevention
      if (file.type.startsWith("image/")) {
        try {
          const exif = await exifr.parse(buffer);
          const exifDate = exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate;
          if (exifDate) {
            const fileDate = new Date(exifDate);
            const diffTime = orderDate - fileDate; // Difference in ms
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays > 90) {
              fraudFlag = true;
              fraudNotes = `Evidence photo creation date (${fileDate.toLocaleDateString()}) pre-dates the order date (${orderDate.toLocaleDateString()}) by ${Math.round(diffDays)} days.`;
              metadataNotes = "EXIF metadata check: File creation date pre-dates order — flagged for manual review.";
            }
          }
        } catch (exifErr) {
          console.warn("[upload-evidence] EXIF check skipped or failed for file:", file.name, exifErr.message);
        }
      }

      // Upload to private storage bucket
      const filenameCleaned = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `${returnRequestId}/${Date.now()}_${filenameCleaned}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(path, buffer, {
          contentType: file.type,
          duplex: "half"
        });

      if (uploadErr) {
        console.error(`[upload-evidence] Failed to upload ${file.name}:`, uploadErr.message);
        throw uploadErr;
      }

      uploadedPaths.push(path);
    }

    // 4. Update return request status and evidence lists
    if (fallbackUsed) {
      // Fallback update on orders.shipping_address
      const { data: orderData, error: fetchErr } = await supabase
        .from("orders")
        .select("shipping_address")
        .eq("id", orderId)
        .maybeSingle();

      if (orderData && !fetchErr) {
        const rr = orderData.shipping_address?.return_request || {};
        const updatedAddress = {
          ...orderData.shipping_address,
          return_request: {
            ...rr,
            evidence_urls: [...(rr.evidence_urls || []), ...uploadedPaths],
            evidence_skipped: false,
            evidence_submitted_at: new Date().toISOString(),
            fraud_flag: fraudFlag || rr.fraud_flag || false,
            fraud_notes: fraudNotes ? `${rr.fraud_notes || ""}\n${fraudNotes}`.trim() : rr.fraud_notes || null,
            metadata_notes: metadataNotes || rr.metadata_notes || null
          }
        };

        await supabase
          .from("orders")
          .update({ shipping_address: updatedAddress })
          .eq("id", orderId);
      }
    } else {
      // Regular table update in return_requests
      const { data: existingReq } = await supabase
        .from("return_requests")
        .select("evidence_urls, fraud_flag, fraud_notes")
        .eq("id", returnRequestId)
        .maybeSingle();

      const existingUrls = existingReq?.evidence_urls || [];
      const updatedUrls = [...existingUrls, ...uploadedPaths];

      await supabase
        .from("return_requests")
        .update({
          evidence_urls: updatedUrls,
          evidence_skipped: false,
          evidence_submitted_at: new Date().toISOString(),
          fraud_flag: fraudFlag || existingReq?.fraud_flag || false,
          fraud_notes: fraudNotes ? `${existingReq?.fraud_notes || ""}\n${fraudNotes}`.trim() : existingReq?.fraud_notes || null,
          metadata_notes: metadataNotes || null
        })
        .eq("id", returnRequestId);
    }

    return NextResponse.json({
      success: true,
      evidence_urls: uploadedPaths,
      fraud_flag: fraudFlag,
      metadata_notes: metadataNotes || null
    });

  } catch (error) {
    console.error("[upload-evidence] Unexpected error uploading return evidence:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload return evidence files" },
      { status: 500 }
    );
  }
}
