import { describe, it, expect, vi } from "vitest";
import {
  formatINR,
  renderOrderConfirmationEmail,
  renderShippingUpdateEmail,
  renderReturnStatusEmail,
  sendNotificationEmail,
  sendEmail,
} from "@/lib/email";

describe("Email Notification Utility Suite", () => {
  describe("formatINR", () => {
    it("formats rupee amounts correctly", () => {
      expect(formatINR(1850)).toContain("1,850");
      expect(formatINR(0)).toContain("0");
      expect(formatINR(null)).toBe("₹0");
    });

    it("handles paise values greater than 50,000", () => {
      // 185000 paise = 1850 rupees
      expect(formatINR(185000)).toContain("1,850");
    });

    it("handles forced paise formatting correctly even under 50,000", () => {
      // 19550 paise = 195.5 rupees -> ₹196
      expect(formatINR(19550, true)).toContain("196");
    });
  });

  describe("renderOrderConfirmationEmail", () => {
    it("renders order confirmation HTML containing order number and client name", () => {
      const html = renderOrderConfirmationEmail({
        orderNumber: "ORD-9988",
        customerName: "Aria Montgomery",
        items: [
          { name: "Silk Trench Coat", size: "M", color: "Noir", price: 25000, quantity: 1 },
        ],
        totals: { subtotal: 25000, discount: 0, shipping: 0, tax: 4500, total: 29500 },
        paymentMethod: "Razorpay (Online)",
        shippingAddress: { full_name: "Aria Montgomery", city: "Mumbai" },
      });

      expect(html).toContain("Order Confirmed #ORD-9988");
      expect(html).toContain("Aria Montgomery");
      expect(html).toContain("Silk Trench Coat");
      expect(html).toContain("Razorpay (Online)");
      expect(html).toContain(">Price<");
      expect(html).toContain(">Total<");
    });

    it("correctly renders paise values, individual item price, and GST without inflation", () => {
      const html = renderOrderConfirmationEmail({
        orderNumber: "CCP-942685",
        customerName: "Ashik",
        inPaise: true,
        items: [
          {
            name: "PLATINUM BLOCK HEEL",
            size: "38",
            color: "Silver",
            price: 97750, // ₹977.50 each in paise
            quantity: 2,
          },
          {
            name: "SILK SLIP ARCHIVE DRESS",
            price: 195500, // ₹1,955.00 each in paise
            quantity: 1,
          },
        ],
        totals: {
          subtotal: 391000, // ₹3,910 in paise
          discount: 0,
          shipping: 0,
          tax: 19550, // 5% GST = ₹195.50 in paise
          total: 391000, // ₹3,910 in paise
        },
        paymentMethod: "Cash on Delivery (COD)",
        shippingAddress: {
          full_name: "Ashik",
          address_line1: "B4-02 oxoniya",
          city: "Aluva",
          state: "Kerala",
          pincode: "675433",
        },
      });

      // Headers check
      expect(html).toContain("Price");
      expect(html).toContain("Total");

      // Item names and prices check (individual price should NOT be 0)
      expect(html).toContain("PLATINUM BLOCK HEEL");
      expect(html).not.toContain("₹0</td>"); // No item amount should be ₹0

      // Tax should NOT be 19,550
      expect(html).not.toContain("19,550");
      expect(html).toContain("GST");
      expect(html).toContain("(Included)");
      expect(html).toContain("196"); // ₹195.50 rounded to ₹196
    });
  });

  describe("renderShippingUpdateEmail", () => {
    it("renders dispatched shipping notification correctly", () => {
      const html = renderShippingUpdateEmail({
        orderNumber: "ORD-9988",
        customerName: "Aria Montgomery",
        status: "shipped",
        trackingNumber: "AWB123456789",
        courierName: "BlueDart Express",
      });

      expect(html).toContain("Order Dispatched #ORD-9988");
      expect(html).toContain("AWB123456789");
      expect(html).toContain("BlueDart Express");
    });

    it("renders delivered shipping notification correctly", () => {
      const html = renderShippingUpdateEmail({
        orderNumber: "ORD-9988",
        customerName: "Aria Montgomery",
        status: "delivered",
        courierName: "BlueDart Express",
      });

      expect(html).toContain("Order Delivered #ORD-9988");
      expect(html).toContain("successfully delivered");
    });
  });

  describe("renderReturnStatusEmail", () => {
    it("renders return status update HTML for approved return", () => {
      const html = renderReturnStatusEmail({
        orderNumber: "ORD-9988",
        customerName: "Aria Montgomery",
        requestId: "REQ-001",
        requestType: "return",
        status: "approved",
        reason: "damaged",
        adminNotes: "Approved for reverse pickup",
      });

      expect(html).toContain("Return Approved");
      expect(html).toContain("Approved for reverse pickup");
      expect(html).toContain("DAMAGED");
    });
  });

  describe("sendNotificationEmail & sendEmail", () => {
    it("logs to sandbox when RESEND_API_KEY is not set or mock", async () => {
      const spyLog = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await sendNotificationEmail({
        type: "order_confirmation",
        to: "client@example.com",
        data: {
          orderNumber: "ORD-1234",
          customerName: "Test Client",
          items: [],
          totals: { total: 5000 },
        },
      });

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(spyLog).toHaveBeenCalledWith(
        expect.stringContaining("[Email Sandbox Dispatch Alert]")
      );

      spyLog.mockRestore();
    });

    it("throws an error if recipient email is missing", async () => {
      await expect(
        sendEmail({ to: "", subject: "Test", html: "<p>Test</p>" })
      ).rejects.toThrow("Recipient email address ('to') is required");
    });
  });
});
