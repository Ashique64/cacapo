import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { phone, templateName, parameters } = await request.json();

    if (!phone || !templateName) {
      return NextResponse.json({ error: "Missing phone or templateName parameters" }, { status: 400 });
    }

    // Clean phone number: remove any non-digit characters
    let cleanPhone = phone.replace(/\D/g, "");
    
    // Default country code handling: e.g. for India add '91' if length is exactly 10 digits
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.META_WHATSAPP_API_VERSION || "v20.0";

    // Format parameters into Meta's component structure
    const bodyParameters = (parameters || []).map((param) => ({
      type: "text",
      text: String(param)
    }));

    const components = bodyParameters.length > 0 ? [
      {
        type: "body",
        parameters: bodyParameters
      }
    ] : [];

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en_US"
        },
        components: components
      }
    };

    // Sandbox/Mock fallback if credentials are not configured or set to mock keys
    if (!token || !phoneNumberId || token.includes("mock") || phoneNumberId.includes("mock")) {
      console.log(`[WhatsApp Sandbox Alert] Sending template '${templateName}' to ${cleanPhone} with parameters:`, parameters);
      return NextResponse.json({
        success: true,
        mock: true,
        message_id: `wamid.HBgLOTE5ODc2NTQzMjEwFQIAERg2REUzRjQ1NkI3ODkwQUJDREU5AD=`,
        recipient: cleanPhone,
        templateName
      });
    }

    // Live Meta Graph API request
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta Graph API WhatsApp Error:", data);
      return NextResponse.json({ error: data.error?.message || "Failed to send WhatsApp message" }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message_id: data.messages?.[0]?.id,
      recipient: cleanPhone
    });
  } catch (error) {
    console.error("WhatsApp Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process WhatsApp request" }, { status: 500 });
  }
}
