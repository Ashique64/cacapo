import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required form parameters" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recipientEmail = "support@cacapoclothing.com";

    // Sandbox/Mock fallback if RESEND_API_KEY is not configured
    if (!apiKey || apiKey.includes("mock")) {
      console.log(`[Contact Sandbox Alert] Email to ${recipientEmail} with contents:`, {
        from: "Cacapo Contact Desk <contact@cacapoclothing.com>",
        senderName: name,
        senderEmail: email,
        subject: `New Contact Inquiry: ${subject}`,
        message: message
      });
      return NextResponse.json({
        success: true,
        mock: true,
        message: "Message processed successfully in sandbox mode."
      });
    }

    // Live Resend API delivery
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Cacapo Contact Desk <contact@cacapoclothing.com>",
        to: recipientEmail,
        reply_to: email,
        subject: `New Contact Inquiry: ${subject}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #111;">
            <h2>New Contact Inquiry from Website</h2>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email Address:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <br/>
            <p><strong>Inquiry Details:</strong></p>
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #FF4D4D; font-style: italic;">
              ${message.replace(/\n/g, "<br/>")}
            </div>
          </div>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API Error details:", data);
      return NextResponse.json({ error: data.message || "Failed to deliver contact inquiry email" }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      id: data.id
    });
  } catch (error) {
    console.error("Contact API Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process contact inquiry request" }, { status: 500 });
  }
}
