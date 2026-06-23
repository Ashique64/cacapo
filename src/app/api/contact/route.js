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
          <div style="background-color: #000000; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; color: #FFFFFF;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #09090b; border: 1px solid #1f1f23; border-top: 3px solid #FF4D4D; padding: 30px;">
              
              <!-- Brand Header -->
              <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #1f1f23; padding-bottom: 20px;">
                <h1 style="font-size: 24px; font-weight: 900; letter-spacing: 0.25em; text-transform: uppercase; margin: 0; color: #FFFFFF;">CACAPO</h1>
                <span style="font-size: 9px; font-weight: 700; letter-spacing: 0.35em; color: #FF4D4D; text-transform: uppercase; display: block; margin-top: 5px;">Client Services Desk</span>
              </div>

              <!-- Content Body -->
              <div style="margin-bottom: 30px;">
                <h2 style="font-size: 14px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #FFFFFF; margin-bottom: 20px; border-left: 2px solid #FF4D4D; padding-left: 10px;">
                  Concierge Inquiry Received
                </h2>
                
                <!-- Metadata table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
                  <tbody>
                    <tr style="border-bottom: 1px solid #18181b;">
                      <td style="padding: 10px 0; color: #71717a; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; width: 35%;">Client Name</td>
                      <td style="padding: 10px 0; color: #e4e4e7; font-weight: 700;">${name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #18181b;">
                      <td style="padding: 10px 0; color: #71717a; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Email Address</td>
                      <td style="padding: 10px 0; color: #e4e4e7; font-family: monospace; font-size: 12px;"><a href="mailto:${email}" style="color: #FF4D4D; text-decoration: none;">${email}</a></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #18181b;">
                      <td style="padding: 10px 0; color: #71717a; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Subject</td>
                      <td style="padding: 10px 0; color: #e4e4e7; font-weight: 600;">${subject}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #71717a; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Submitted Date</td>
                      <td style="padding: 10px 0; color: #71717a; font-size: 11px;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
                    </tr>
                  </tbody>
                </table>

                <!-- Message Box -->
                <div style="margin-top: 20px;">
                  <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: #71717a; text-transform: uppercase; display: block; margin-bottom: 10px;">Inquiry Details</span>
                  <div style="background-color: #030303; border: 1px solid #18181b; padding: 20px; font-size: 13px; line-height: 1.6; color: #d4d4d8; border-left: 3px solid #FF4D4D;">
                    ${message.replace(/\n/g, "<br/>")}
                  </div>
                </div>
              </div>

              <!-- Footer info -->
              <div style="border-top: 1px solid #1f1f23; padding-top: 20px; text-align: center;">
                <a href="https://cacapo.vercel.app/admin" style="display: inline-block; background-color: #FFFFFF; color: #000000; font-size: 10px; font-weight: 700; letter-spacing: 0.20em; text-decoration: none; text-transform: uppercase; padding: 12px 25px; margin-bottom: 15px;">Open Admin Dashboard</a>
                <p style="font-size: 9px; color: #52525b; margin: 0; letter-spacing: 0.05em; line-height: 1.5;">
                  This is an automated request sent from the Cacapo Contact Desk. Please reply directly to this email to contact the customer.
                </p>
              </div>

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
