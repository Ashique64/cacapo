/**
 * CACAPO — Email Notification Service
 *
 * Provides transactional HTML email rendering and delivery for:
 * 1. Order Confirmation (COD, UPI, Razorpay)
 * 2. Shipping & Tracking Updates (Dispatched, Delivered)
 * 3. Return & Exchange Status Updates (Requested, Under Review, Approved, Rejected, Completed)
 */

/**
 * Format currency amount in INR format (e.g., ₹1,850.00 or input in paise/rupees)
 */
export function formatINR(amountInPaiseOrRupees) {
  if (amountInPaiseOrRupees == null) return "₹0";
  const numericVal = typeof amountInPaiseOrRupees === "number" ? amountInPaiseOrRupees : parseFloat(amountInPaiseOrRupees);
  const rupees = numericVal > 50000 && Number.isInteger(numericVal) ? numericVal / 100 : numericVal;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Common HTML wrapper layout matching CACAPO luxury dark aesthetic
 */
function buildEmailWrapper({ title, previewText, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <style type="text/css">
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background-color: #000000;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
      border-collapse: collapse !important;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    * {
      box-sizing: border-box !important;
    }
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: auto !important;
      }
      .stack-column {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        direction: ltr !important;
      }
      .mobile-padding {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #FFFFFF;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #000000; opacity: 0;">${previewText || title}</div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #000000; table-layout: fixed; width: 100%;">
    <tr>
      <td align="center" style="padding: 20px 8px;">
        <!--[if mso]>
        <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td>
        <![endif]-->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #09090b; border: 1px solid #1f1f23; border-top: 3px solid #FF4D4D; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 24px 20px 24px; text-align: center; border-bottom: 1px solid #1f1f23;">
              <h1 style="font-size: 26px; font-weight: 900; letter-spacing: 0.35em; text-transform: uppercase; margin: 0; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">CACAPO</h1>
              <span style="font-size: 9px; font-weight: 700; letter-spacing: 0.4em; color: #FF4D4D; text-transform: uppercase; display: block; margin-top: 8px;">COUTURE &amp; ATELIER</span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="padding: 28px 24px; word-break: break-word; word-wrap: break-word;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="mobile-padding" style="padding: 24px; background-color: #040405; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="font-size: 11px; color: #71717a; margin: 0 0 10px 0; letter-spacing: 0.05em; line-height: 1.5;">
                Need assistance? Contact our concierge at <a href="mailto:support@cacapoclothing.com" style="color: #FF4D4D; text-decoration: none; font-weight: 600;">support@cacapoclothing.com</a>
              </p>
              <p style="font-size: 9px; color: #52525b; margin: 0; letter-spacing: 0.12em; text-transform: uppercase;">
                &copy; ${new Date().getFullYear()} CACAPO HOUSE OF FASHION. ALL RIGHTS RESERVED.
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Render Order Confirmation Email HTML
 */
export function renderOrderConfirmationEmail({
  orderNumber,
  customerName,
  items = [],
  totals = {},
  paymentMethod = "COD",
  shippingAddress = {},
}) {
  const name = customerName || shippingAddress?.full_name || "Valued Client";
  const itemsListHtml = items.map((item) => {
    const itemName = item.name || item.product?.name || "Couture Piece";
    const size = item.size || item.variant?.size || "";
    const color = item.color || item.variant?.color || "";
    const variantStr = [size, color].filter(Boolean).join(" / ");
    const qty = item.quantity || 1;
    const total = formatINR((item.price || item.unit_price || 0) * qty);

    return `<tr style="border-bottom: 1px solid #18181b;">
      <td style="padding: 12px 0; color: #e4e4e7; font-size: 13px; font-weight: 600; word-break: break-word;">
        ${itemName}
        ${variantStr ? `<br/><span style="font-size: 10px; color: #71717a; font-weight: 400; text-transform: uppercase;">Variant: ${variantStr}</span>` : ""}
      </td>
      <td style="padding: 12px 0; color: #a1a1aa; font-size: 12px; text-align: center; white-space: nowrap;">x${qty}</td>
      <td style="padding: 12px 0; color: #e4e4e7; font-size: 13px; font-weight: 700; text-align: right; white-space: nowrap;">${total}</td>
    </tr>`;
  }).join("");

  const subtotalFormatted = formatINR(totals.subtotal || totals.subTotal || 0);
  const discountFormatted = formatINR(totals.discount || 0);
  const shippingFormatted = totals.shipping === 0 ? "FREE" : formatINR(totals.shipping || 0);
  const taxFormatted = formatINR(totals.tax || 0);
  const totalFormatted = formatINR(totals.total || totals.total_amount || 0);

  const addressLine = [
    shippingAddress?.address_line1 || shippingAddress?.address,
    shippingAddress?.address_line2,
    shippingAddress?.city,
    shippingAddress?.state,
    shippingAddress?.pincode
  ].filter(Boolean).join(", ");

  const contentHtml = `
    <h2 style="font-size: 15px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #FFFFFF; margin: 0 0 12px 0; border-left: 3px solid #FF4D4D; padding-left: 10px; line-height: 1.4;">
      Order Confirmed #${orderNumber}
    </h2>
    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px 0;">
      Dear ${name},<br/>
      Thank you for your order with CACAPO. We have received your order details and are preparing your collection pieces for dispatch.
    </p>

    <!-- Order Items -->
    <div style="margin-bottom: 24px;">
      <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: #71717a; text-transform: uppercase; display: block; margin-bottom: 10px;">Items Ordered</span>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #27272a; text-align: left;">
            <th style="padding-bottom: 8px; font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 0.1em;">Item</th>
            <th style="padding-bottom: 8px; font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 0.1em; text-align: center;">Qty</th>
            <th style="padding-bottom: 8px; font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 0.1em; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsListHtml}
        </tbody>
      </table>
    </div>

    <!-- Summary & Address Blocks (Stacked vertically for zero overflow) -->
    <div style="margin-bottom: 24px;">
      <!-- Shipping Card -->
      <div style="background-color: #030303; border: 1px solid #18181b; padding: 16px; margin-bottom: 12px; border-radius: 4px;">
        <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: #71717a; text-transform: uppercase; display: block; margin-bottom: 8px;">Shipping Destination</span>
        <p style="font-size: 12px; color: #e4e4e7; margin: 0; line-height: 1.5; word-break: break-word;">
          <strong style="color: #FFFFFF;">${shippingAddress?.full_name || name}</strong><br/>
          ${addressLine || "Address on file"}<br/>
          ${shippingAddress?.phone ? `<span style="color: #a1a1aa;">Phone: ${shippingAddress.phone}</span>` : ""}
        </p>
      </div>

      <!-- Payment Summary Card -->
      <div style="background-color: #030303; border: 1px solid #18181b; padding: 16px; border-radius: 4px;">
        <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: #71717a; text-transform: uppercase; display: block; margin-bottom: 10px;">Order Summary</span>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr><td style="padding: 3px 0; color: #71717a;">Subtotal</td><td style="padding: 3px 0; text-align: right; color: #e4e4e7;">${subtotalFormatted}</td></tr>
          ${totals.discount > 0 ? `<tr><td style="padding: 3px 0; color: #FF4D4D;">Discount</td><td style="padding: 3px 0; text-align: right; color: #FF4D4D;">-${discountFormatted}</td></tr>` : ""}
          <tr><td style="padding: 3px 0; color: #71717a;">Shipping</td><td style="padding: 3px 0; text-align: right; color: #e4e4e7;">${shippingFormatted}</td></tr>
          <tr><td style="padding: 3px 0; color: #71717a;">GST / Tax</td><td style="padding: 3px 0; text-align: right; color: #e4e4e7;">${taxFormatted}</td></tr>
          <tr style="border-top: 1px solid #27272a;"><td style="padding: 8px 0 3px 0; color: #FFFFFF; font-weight: 700;">Total Paid</td><td style="padding: 8px 0 3px 0; text-align: right; color: #FFFFFF; font-weight: 700;">${totalFormatted}</td></tr>
          <tr><td style="padding: 2px 0; color: #71717a; font-size: 10px;">Payment Method</td><td style="padding: 2px 0; text-align: right; color: #a1a1aa; font-size: 10px; text-transform: uppercase;">${paymentMethod}</td></tr>
        </table>
      </div>
    </div>

    <div style="text-align: center; margin-top: 28px;">
      <a href="https://cacapo.vercel.app/account" style="display: inline-block; background-color: #FFFFFF; color: #000000; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-decoration: none; text-transform: uppercase; padding: 14px 28px; border-radius: 2px;">View Order Status</a>
    </div>
  `;

  return buildEmailWrapper({
    title: `Order Confirmed #${orderNumber} — CACAPO`,
    previewText: `Thank you for your purchase! Order #${orderNumber} has been received.`,
    contentHtml,
  });
}

/**
 * 2. Render Shipping Update Email HTML
 */
export function renderShippingUpdateEmail({
  orderNumber,
  customerName,
  status = "shipped",
  trackingNumber,
  courierName = "Express Delivery",
  trackingUrl,
  shippingAddress = {},
}) {
  const name = customerName || shippingAddress?.full_name || "Valued Client";
  const isDelivered = status.toLowerCase() === "delivered";
  const statusTitle = isDelivered ? "Order Delivered" : "Order Dispatched";
  const statusBadgeColor = isDelivered ? "#22c55e" : "#f97316";

  const contentHtml = `
    <h2 style="font-size: 15px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #FFFFFF; margin: 0 0 12px 0; border-left: 3px solid ${statusBadgeColor}; padding-left: 10px; line-height: 1.4;">
      ${statusTitle} #${orderNumber}
    </h2>
    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px 0;">
      Dear ${name},<br/>
      ${isDelivered
        ? `Great news! Your package for Order #${orderNumber} has been successfully delivered. We hope you love your new CACAPO piece.`
        : `Your order #${orderNumber} is on its way! It has been handed over to our delivery partner and is currently in transit to your destination.`}
    </p>

    <!-- Tracking Details Box -->
    <div style="background-color: #030303; border: 1px solid #18181b; border-left: 3px solid ${statusBadgeColor}; padding: 18px; margin-bottom: 24px; border-radius: 4px;">
      <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: #71717a; text-transform: uppercase; display: block; margin-bottom: 12px;">Shipment Intelligence</span>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #18181b;">
          <td style="padding: 8px 0; color: #71717a; width: 40%;">Courier Partner</td>
          <td style="padding: 8px 0; color: #FFFFFF; font-weight: 600;">${courierName}</td>
        </tr>
        ${trackingNumber ? `<tr style="border-bottom: 1px solid #18181b;">
          <td style="padding: 8px 0; color: #71717a;">Tracking Waybill (AWB)</td>
          <td style="padding: 8px 0; color: #FF4D4D; font-family: monospace; font-weight: 700; word-break: break-all;">${trackingNumber}</td>
        </tr>` : ""}
        <tr>
          <td style="padding: 8px 0; color: #71717a;">Current Status</td>
          <td style="padding: 8px 0; color: ${statusBadgeColor}; font-weight: 700; text-transform: uppercase;">${status}</td>
        </tr>
      </table>
    </div>

    ${trackingUrl ? `<div style="text-align: center; margin-top: 28px;">
      <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #FFFFFF; color: #000000; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-decoration: none; text-transform: uppercase; padding: 14px 28px; border-radius: 2px;">Track Shipment Live</a>
    </div>` : `<div style="text-align: center; margin-top: 28px;">
      <a href="https://cacapo.vercel.app/account" style="display: inline-block; background-color: #FFFFFF; color: #000000; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-decoration: none; text-transform: uppercase; padding: 14px 28px; border-radius: 2px;">View Account Dashboard</a>
    </div>`}
  `;

  return buildEmailWrapper({
    title: `${statusTitle} #${orderNumber} — CACAPO`,
    previewText: isDelivered ? `Order #${orderNumber} has been delivered.` : `Order #${orderNumber} is on its way via ${courierName}.`,
    contentHtml,
  });
}

/**
 * 3. Render Return / Exchange Status Email HTML
 */
export function renderReturnStatusEmail({
  orderNumber,
  customerName,
  requestId,
  requestType = "return",
  status = "pending",
  reason = "",
  adminNotes = "",
  refundAmount,
}) {
  const name = customerName || "Valued Client";
  const isExchange = requestType.toLowerCase() === "exchange";
  const typeLabel = isExchange ? "Exchange" : "Return";

  let statusTitle = `${typeLabel} Request Received`;
  let statusColor = "#eab308"; // Amber
  let statusDescription = `Your ${typeLabel.toLowerCase()} request for Order #${orderNumber} has been logged and is awaiting verification by our Client Desk.`;

  if (status === "under_review") {
    statusTitle = `${typeLabel} Under Review`;
    statusColor = "#3b82f6"; // Blue
    statusDescription = `Our quality assurance team is currently reviewing your ${typeLabel.toLowerCase()} request and submitted evidence for Order #${orderNumber}.`;
  } else if (status === "approved") {
    statusTitle = `${typeLabel} Approved`;
    statusColor = "#22c55e"; // Green
    statusDescription = `Your ${typeLabel.toLowerCase()} request for Order #${orderNumber} has been approved! Our logistics courier will initiate reverse pickup shortly.`;
  } else if (status === "rejected") {
    statusTitle = `${typeLabel} Request Update`;
    statusColor = "#ef4444"; // Red
    statusDescription = `We have reviewed your ${typeLabel.toLowerCase()} request for Order #${orderNumber}. Unfortunately, we are unable to process this request at this time.`;
  } else if (status === "completed") {
    statusTitle = `${typeLabel} Completed`;
    statusColor = "#14b8a6"; // Teal
    statusDescription = `Your ${typeLabel.toLowerCase()} for Order #${orderNumber} has been completed successfully. ${refundAmount ? `Refund of ${formatINR(refundAmount)} has been credited.` : ""}`;
  }

  const contentHtml = `
    <h2 style="font-size: 15px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #FFFFFF; margin: 0 0 12px 0; border-left: 3px solid ${statusColor}; padding-left: 10px; line-height: 1.4;">
      ${statusTitle}
    </h2>
    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px 0;">
      Dear ${name},<br/>
      ${statusDescription}
    </p>

    <!-- Details -->
    <div style="background-color: #030303; border: 1px solid #18181b; padding: 18px; margin-bottom: 24px; border-radius: 4px;">
      <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: #71717a; text-transform: uppercase; display: block; margin-bottom: 12px;">Case Information</span>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #18181b;">
          <td style="padding: 8px 0; color: #71717a; width: 40%;">Order Number</td>
          <td style="padding: 8px 0; color: #FFFFFF; font-weight: 600;">#${orderNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #18181b;">
          <td style="padding: 8px 0; color: #71717a;">Request Type</td>
          <td style="padding: 8px 0; color: #FFFFFF; text-transform: uppercase; font-weight: 600;">${typeLabel}</td>
        </tr>
        ${reason ? `<tr style="border-bottom: 1px solid #18181b;">
          <td style="padding: 8px 0; color: #71717a;">Reason Code</td>
          <td style="padding: 8px 0; color: #e4e4e7;">${reason.replace(/_/g, " ").toUpperCase()}</td>
        </tr>` : ""}
        <tr>
          <td style="padding: 8px 0; color: #71717a;">Current Status</td>
          <td style="padding: 8px 0; color: ${statusColor}; font-weight: 700; text-transform: uppercase;">${status.replace(/_/g, " ")}</td>
        </tr>
      </table>

      ${adminNotes ? `<div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #18181b;">
        <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: #71717a; text-transform: uppercase; display: block; margin-bottom: 6px;">Client Desk Note</span>
        <p style="font-size: 12px; color: #d4d4d8; margin: 0; line-height: 1.5; font-style: italic;">"${adminNotes}"</p>
      </div>` : ""}
    </div>

    <div style="text-align: center; margin-top: 28px;">
      <a href="https://cacapo.vercel.app/account" style="display: inline-block; background-color: #FFFFFF; color: #000000; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-decoration: none; text-transform: uppercase; padding: 14px 28px; border-radius: 2px;">Manage Returns in Account</a>
    </div>
  `;

  return buildEmailWrapper({
    title: `${statusTitle} #${orderNumber} — CACAPO`,
    previewText: `${typeLabel} request update for Order #${orderNumber}: ${status.replace(/_/g, " ")}`,
    contentHtml,
  });
}

/**
 * Low-level Resend API Dispatcher with Mock Sandbox Fallback
 */
export async function sendEmail({ to, subject, html }) {
  if (!to) {
    throw new Error("Recipient email address ('to') is required");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = "CACAPO <no-reply@cacapoclothing.com>";

  // Sandbox / Mock fallback if RESEND_API_KEY is not configured
  if (!apiKey || apiKey.includes("mock")) {
    console.log(`[Email Sandbox Dispatch Alert] Email to: ${to} | Subject: "${subject}"`);
    return {
      success: true,
      mock: true,
      id: "mock_msg_" + Date.now(),
      message: "Email logged to sandbox environment (RESEND_API_KEY not configured).",
    };
  }

  // Live Resend API Call
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to,
      subject,
      html,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Resend API Delivery Error:", data);
    throw new Error(data.message || `Resend API returned status ${response.status}`);
  }

  return {
    success: true,
    id: data.id,
  };
}

/**
 * Unified notification helper
 */
export async function sendNotificationEmail({ type, to, data }) {
  let subject = "";
  let html = "";

  switch (type) {
    case "order_confirmation":
      subject = `Order Confirmation #${data.orderNumber} — CACAPO`;
      html = renderOrderConfirmationEmail(data);
      break;

    case "shipping_update":
      const statusTitle = data.status === "delivered" ? "Order Delivered" : "Order Dispatched";
      subject = `${statusTitle} #${data.orderNumber} — CACAPO`;
      html = renderShippingUpdateEmail(data);
      break;

    case "return_status":
      const reqType = (data.requestType || "return").toUpperCase();
      subject = `${reqType} Status Update #${data.orderNumber} — CACAPO`;
      html = renderReturnStatusEmail(data);
      break;

    default:
      throw new Error(`Unsupported email notification type: '${type}'`);
  }

  return sendEmail({ to, subject, html });
}

