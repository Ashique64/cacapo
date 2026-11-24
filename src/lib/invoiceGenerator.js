/**
 * CACAPO Tax Invoice Generator Utility
 * Generates GST-compliant Tax Invoice PDF documents using jsPDF & autoTable.
 */

/**
 * Safely loads a signature image file from public folders if present.
 */
export async function loadSignatureImage() {
  if (typeof window === "undefined") return null;
  const candidateUrls = [
    "/images/signature.png",
    "/Images/signature.png",
    "/signature.png",
    "/images/signature.jpg",
    "/Images/signature.jpg"
  ];
  for (const url of candidateUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.type.includes("image") || blob.size > 0) {
          const res = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ dataUrl: reader.result, format: url.endsWith(".jpg") ? "JPEG" : "PNG" });
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (res && res.dataUrl) return res;
        }
      }
    } catch {
      // ignore & try next
    }
  }
  return null;
}

// GST State Code mapping for Indian states
const STATE_GST_CODES = {
  "kerala": "Kerala (32)",
  "tamil nadu": "Tamil Nadu (33)",
  "karnataka": "Karnataka (29)",
  "maharashtra": "Maharashtra (27)",
  "delhi": "Delhi (07)",
  "telangana": "Telangana (36)",
  "andhra pradesh": "Andhra Pradesh (37)",
  "gujarat": "Gujarat (24)",
  "west bengal": "West Bengal (19)",
  "uttar pradesh": "Uttar Pradesh (09)",
  "rajasthan": "Rajasthan (08)",
  "haryana": "Haryana (06)",
  "punjab": "Punjab (03)",
  "goa": "Goa (30)",
  "puducherry": "Puducherry (34)",
  "bihar": "Bihar (10)",
  "odisha": "Odisha (21)",
  "assam": "Assam (18)",
  "madhya pradesh": "Madhya Pradesh (23)",
  "chhattisgarh": "Chhattisgarh (22)",
  "jharkhand": "Jharkhand (20)",
  "uttarakhand": "Uttarakhand (05)",
  "himachal pradesh": "Himachal Pradesh (02)",
  "jammu & kashmir": "Jammu & Kashmir (01)",
  "jammu and kashmir": "Jammu & Kashmir (01)",
  "chandigarh": "Chandigarh (04)",
  "ladakh": "Ladakh (38)",
  "sikkim": "Sikkim (11)",
  "meghalaya": "Meghalaya (17)",
  "tripura": "Tripura (16)",
  "mizoram": "Mizoram (15)",
  "manipur": "Manipur (14)",
  "nagaland": "Nagaland (13)",
  "arunachal pradesh": "Arunachal Pradesh (12)"
};

/**
 * Resolves the Place of Supply string with GST State Code.
 */
export function getPlaceOfSupply(stateName) {
  if (!stateName || typeof stateName !== "string") {
    return "Kerala (32)";
  }
  const cleanState = stateName.trim().toLowerCase();
  return STATE_GST_CODES[cleanState] || `${stateName.trim()} (32)`;
}

/**
 * Resolves the HSN/SAC code based on product category or name keywords.
 */
export function resolveHsnCode(product) {
  if (product?.hsn_code) return product.hsn_code;

  const textToSearch = [
    product?.name || "",
    product?.category?.name || "",
    product?.category_name || "",
    product?.description || ""
  ].join(" ").toLowerCase();

  // Bag keywords -> 4202
  const bagKeywords = ["bag", "tote", "handbag", "clutch", "wallet", "backpack", "purse", "pouch", "crossbody", "satchel", "duffel"];
  if (bagKeywords.some(kw => textToSearch.includes(kw))) {
    return "4202";
  }

  // Footwear keywords -> 6404
  return "6404";
}

/**
 * Converts a numeric amount in Rupees to Indian currency words.
 * Example: 3399 -> "Rupees Three Thousand Three Hundred Ninety-Nine Only"
 */
export function convertAmountToWords(amountInRupees) {
  if (isNaN(amountInRupees) || amountInRupees <= 0) {
    return "Rupees Zero Only";
  }

  const rounded = Math.round(amountInRupees * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function numToWords(num) {
    if (num === 0) return "";
    if (num < 20) return units[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? "-" + units[num % 10] : "");
    if (num < 1000) return units[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " " + numToWords(num % 100) : "");
    if (num < 100000) return numToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + numToWords(num % 1000) : "");
    if (num < 10000000) return numToWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 !== 0 ? " " + numToWords(num % 100000) : "");
    return numToWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 !== 0 ? " " + numToWords(num % 10000000) : "");
  }

  let words = "Rupees " + numToWords(rupees);
  if (paise > 0) {
    words += " and " + numToWords(paise) + " Paise";
  }
  words += " Only";
  return words;
}

// =========================================================================
// GST SCHEME CONFIGURATION:
// Year 1: Composition Scheme (1% Flat GST - Bill of Supply)
// Year 2: Normal GST Scheme (5% below ₹2,499 / 18% above ₹2,499 - Tax Invoice)
// Set USE_COMPOSITION_GST = false to restore Normal GST Tax Invoices in Year 2.
// =========================================================================
export const USE_COMPOSITION_GST = true;

/**
 * Main function to generate and download Tax Invoice / Bill of Supply PDF for an order.
 * @param {Object} order - Order object from database
 * @param {string} gstNumber - Store GSTIN setting
 * @param {string} [format="a4"] - "a4" for standard office PDF, or "thermal" / "100x150" for 4"x6" thermal printer
 */
export async function generateTaxInvoice(order, gstNumber = "", format = "a4") {
  if (format === "thermal" || format === "100x150" || format === "4x6") {
    return generateTaxInvoiceThermal(order, gstNumber);
  }

  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Store Branding Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(24, 24, 27); // Dark zinc
  doc.text("CACAPO LLP", 14, 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("92/A, Ground Floor, Mundath Building, Melattur", 14, 23);
  doc.text("Opp. Weigh Bridge, Malappuram, Kerala - 679326", 14, 27);
  if (gstNumber) {
    doc.text(`GSTIN: ${gstNumber}`, 14, 31);
  }
  doc.text("Email: support@cacapoclothing.com | Website: cacapoclothing.com", 14, gstNumber ? 35 : 31);

  // Document Title & Invoice Copy Label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(USE_COMPOSITION_GST ? "BILL OF SUPPLY" : "TAX INVOICE", 135, 18);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Original for Recipient", 135, 23);

  // Invoice Details Block
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const createdDate = new Date(order.created_at);
  const formattedDate = createdDate.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
  const shipping = order.shipping_address || {};
  const placeOfSupplyStr = getPlaceOfSupply(shipping.state);

  doc.text(`Invoice No: ${order.order_number}`, 135, 28);
  doc.text(`Date: ${formattedDate}`, 135, 33);
  doc.text(`Payment: ${order.payment_method?.toUpperCase() || "ONLINE"} (${order.payment_status?.toUpperCase() || "PAID"})`, 135, 38);
  doc.text(`Place of Supply: ${placeOfSupplyStr}`, 135, 43);

  // Horizontal Divider Line
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 48, 196, 48);

  // Customer Shipping & Billing Details
  const customerName = shipping.full_name || shipping.name || "N/A";
  const phone = shipping.phone || "N/A";
  const addressLine1 = shipping.address_line1 || shipping.street || "";
  const addressLine2 = shipping.address_line2 || "";
  const city = shipping.city || "";
  const state = shipping.state || "";
  const zip = shipping.pincode || shipping.zip_code || shipping.postal_code || shipping.zip || "";

  let fullAddrParts = [];
  if (addressLine1) fullAddrParts.push(addressLine1);
  if (addressLine2) fullAddrParts.push(addressLine2);
  
  let cityStateZip = [city, state].filter(Boolean).join(", ");
  if (zip) {
    cityStateZip += ` - ${zip}`;
  }
  if (cityStateZip) fullAddrParts.push(cityStateZip);

  const formattedAddressStr = fullAddrParts.join(", ");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(24, 24, 27);
  doc.text("BILL TO / SHIP TO:", 14, 55);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text(`Customer Name: ${customerName}`, 14, 61);
  doc.text(`Phone: ${phone}`, 14, 66);

  // Split address string to ensure no overflow
  const splitAddress = doc.splitTextToSize(`Address: ${formattedAddressStr || 'N/A'}`, 105);
  doc.text(splitAddress, 14, 71);

  // Calculate table items math
  const discountRatio = order.discount && order.subtotal > 0 ? (order.subtotal - order.discount) / order.subtotal : 1;

  let totalTaxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  const cleanState = (state || "").trim().toLowerCase();
  const isSameState = !cleanState || cleanState.includes("kerala") || cleanState === "kl";

  const tableColumn = USE_COMPOSITION_GST
    ? ["S.No.", "Product Description", "HSN/SAC", "Variant", "Qty", "Unit Price", "Total (INR)"]
    : ["S.No.", "Product Description", "HSN/SAC", "Variant", "Qty", "Gross Rate", "Taxable Val", "GST Rate", "GST Amt", "Total (INR)"];
  
  const tableRows = (order.order_items || []).map((item, index) => {
    const grossPrice = item.price || 0; // in paise
    
    // GST Rate logic:
    // Year 1: Composition Scheme flat 1%
    // Year 2: Normal GST Scheme (5% below ₹2,499 / 18% above ₹2,499)
    let rate = 1;
    if (!USE_COMPOSITION_GST) {
      // [YEAR 2: NORMAL GST SCHEME (5% / 18%)]
      rate = grossPrice > 249900 ? 18 : 5;
    }
    const discountedPrice = grossPrice * discountRatio;
    
    // Flat rate GST breakdown
    const unitTax = Math.round(discountedPrice * (rate / 100));
    const unitTaxable = discountedPrice - unitTax;
    
    const qty = item.quantity || 1;
    const itemTaxableTotal = (unitTaxable * qty) / 100;
    const itemTaxTotal = (unitTax * qty) / 100;
    const itemGrossTotal = (discountedPrice * qty) / 100;
    
    totalTaxableValue += itemTaxableTotal;

    const cgstAmount = isSameState ? (itemTaxTotal / 2) : 0;
    const sgstAmount = isSameState ? (itemTaxTotal / 2) : 0;
    const igstAmount = !isSameState ? itemTaxTotal : 0;

    totalCGST += cgstAmount;
    totalSGST += sgstAmount;
    totalIGST += igstAmount;

    const hsnCode = resolveHsnCode(item.product);
    const variantStr = item.variant?.size 
      ? `Size: ${item.variant.size}${item.variant?.color ? ' • ' + item.variant.color : ''}`
      : (item.product?.color ? `Color: ${item.product.color}` : "N/A");

    if (USE_COMPOSITION_GST) {
      return [
        index + 1,
        item.product?.name || "Product Item",
        hsnCode,
        variantStr,
        qty,
        (grossPrice / 100).toFixed(2),
        itemGrossTotal.toFixed(2)
      ];
    }

    return [
      index + 1,
      item.product?.name || "Product Item",
      hsnCode,
      variantStr,
      qty,
      (grossPrice / 100).toFixed(2),
      itemTaxableTotal.toFixed(2),
      `${rate}%`,
      itemTaxTotal.toFixed(2),
      itemGrossTotal.toFixed(2)
    ];
  });

  // Calculate start Y position based on height of address block
  const addressHeight = splitAddress.length * 4.5;
  const startTableY = Math.max(85, 71 + addressHeight + 4);

  autoTable(doc, {
    startY: startTableY,
    head: [tableColumn],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5, halign: "left" },
    columnStyles: USE_COMPOSITION_GST ? {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 26 },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 21, halign: "right" },
      6: { cellWidth: 21, halign: "right" }
    } : {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 46 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 22 },
      4: { cellWidth: 10, halign: "center" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 14, halign: "center" },
      8: { cellWidth: 14, halign: "right" },
      9: { cellWidth: 14, halign: "right" }
    }
  });

  const finalY = doc.lastAutoTable.finalY || 150;

  // Invoice summary & Amount in words block
  doc.setDrawColor(220, 220, 220);
  doc.line(14, finalY + 4, 196, finalY + 4);

  const totalPaidRupees = order.total_amount / 100;
  const amountInWords = convertAmountToWords(totalPaidRupees);

  // Amount in Words block (Left side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text("Amount in Words:", 14, finalY + 12);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const splitWords = doc.splitTextToSize(amountInWords, 95);
  doc.text(splitWords, 14, finalY + 17);

  // Summary math block (Right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text("Summary details:", 125, finalY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  let summaryY = finalY + 18;
  const subtotalRupees = (order.subtotal || (order.total_amount - (order.shipping_charge || 0))) / 100;

  if (USE_COMPOSITION_GST) {
    doc.text(`Subtotal: Rs. ${subtotalRupees.toFixed(2)}`, 125, summaryY);
    if (order.discount > 0) {
      summaryY += 5;
      doc.text(`Coupon Discount: -Rs. ${(order.discount / 100).toFixed(2)}`, 125, summaryY);
    }
    summaryY += 5;
    doc.text(`Shipping Charge: Rs. ${(order.shipping_charge / 100).toFixed(2)}`, 125, summaryY);
    summaryY += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text("(All prices are inclusive of taxes)", 125, summaryY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
  } else {
    // [YEAR 2: NORMAL GST SCHEME (CGST / SGST / IGST)]
    doc.text(`Taxable Value (Excl. GST): Rs. ${totalTaxableValue.toFixed(2)}`, 125, summaryY);
    if (order.discount > 0) {
      summaryY += 5;
      doc.text(`Coupon Discount: -Rs. ${(order.discount / 100).toFixed(2)}`, 125, summaryY);
    }
    summaryY += 5;
    if (isSameState) {
      doc.text(`CGST (Central Tax): Rs. ${totalCGST.toFixed(2)}`, 125, summaryY);
      summaryY += 5;
      doc.text(`SGST (State Tax): Rs. ${totalSGST.toFixed(2)}`, 125, summaryY);
    } else {
      doc.text(`IGST (Interstate Tax): Rs. ${totalIGST.toFixed(2)}`, 125, summaryY);
    }
    summaryY += 5;
    doc.text(`Shipping Charge: Rs. ${(order.shipping_charge / 100).toFixed(2)}`, 125, summaryY);
  }

  summaryY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Amount Paid: Rs. ${totalPaidRupees.toFixed(2)}`, 125, summaryY);

  // Next section Y baseline
  let footerY = Math.max(finalY + 45, summaryY + 12);

  // Terms and Return Policy Section
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, footerY, 182, 20, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(24, 24, 27);
  doc.text("Terms & Return Policy:", 17, footerY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text("• Standard 7-day return/exchange policy applies for unworn items in original packaging with tags intact.", 17, footerY + 10);
  doc.text("• To initiate a return or view full policy, visit cacapoclothing.com/account or contact support@cacapoclothing.com.", 17, footerY + 15);

  footerY += 26;

  // Declaration Block
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const docTypeLabel = USE_COMPOSITION_GST ? "bill of supply" : "tax invoice";
  doc.text(`Declaration: This is a system-generated ${docTypeLabel} and does not require a physical signature.`, 14, footerY + 8);

  // Save the generated PDF
  const filenamePrefix = USE_COMPOSITION_GST ? "CACAPO_BillOfSupply" : "CACAPO_TaxInvoice";
  doc.save(`${filenamePrefix}_${order.order_number}.pdf`);
}

/**
 * Main function to generate and download Packaging Slip PDF for warehouse fulfillment.
 * @param {Object} order - Order object from database
 * @param {string} [format="a4"] - "a4" for standard office PDF, or "thermal" / "100x150" for 4"x6" thermal printer
 */
export async function generatePackagingSlip(order, format = "a4") {
  if (format === "thermal" || format === "100x150" || format === "4x6") {
    return generatePackagingSlipThermal(order);
  }

  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Pack Slip Title & Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(24, 24, 27);
  doc.text("PACKAGING SLIP", 14, 18);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("CACAPO Warehouse & Fulfillment Center", 14, 24);
  doc.text("Internal Order Dispatch & Quality Control", 14, 29);

  // Order Dates and Metadata Block (Right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`ORDER NO: ${order.order_number}`, 125, 18);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
  const packingDate = new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
  const paymentMethodStr = order.payment_method?.toUpperCase() || "COD";
  const paymentStatusStr = order.payment_status?.toUpperCase() || "PENDING";

  doc.text(`Order Date: ${orderDate}`, 125, 24);
  doc.text(`Packing Date: ${packingDate}`, 125, 29);
  doc.text(`Payment: ${paymentMethodStr} (${paymentStatusStr})`, 125, 34);

  // Divider Line
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 39, 196, 39);

  // Shipping Recipient & Courier Weight Info
  const shipping = order.shipping_address || {};
  const customerName = shipping.full_name || shipping.name || "N/A";
  const phone = shipping.phone || "N/A";
  const addressLine1 = shipping.address_line1 || shipping.street || "";
  const addressLine2 = shipping.address_line2 || "";
  const city = shipping.city || "";
  const state = shipping.state || "";
  const zip = shipping.pincode || shipping.zip_code || shipping.postal_code || shipping.zip || "";

  let fullAddrParts = [];
  if (addressLine1) fullAddrParts.push(addressLine1);
  if (addressLine2) fullAddrParts.push(addressLine2);
  let cityStateZip = [city, state].filter(Boolean).join(", ");
  if (zip) cityStateZip += ` - ${zip}`;
  if (cityStateZip) fullAddrParts.push(cityStateZip);

  const formattedAddressStr = fullAddrParts.join(", ");

  // Deliver To (Left side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(24, 24, 27);
  doc.text("DELIVER TO:", 14, 46);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text(`Customer Name: ${customerName}`, 14, 52);
  doc.text(`Phone: ${phone}`, 14, 57);

  const splitAddress = doc.splitTextToSize(`Address: ${formattedAddressStr || 'N/A'}`, 95);
  doc.text(splitAddress, 14, 62);

  // Courier / Dispatch Info (Right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(24, 24, 27);
  doc.text("SHIPMENT DETAILS:", 125, 46);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const courierName = shipping.courier_name || order.courier_name || "Standard Delivery";
  const trackingNo = shipping.tracking_no || order.tracking_number || shipping.awb_code || "Pending Dispatch";
  const totalQty = (order.order_items || []).reduce((acc, item) => acc + (item.quantity || 1), 0);

  doc.text(`Courier Partner: ${courierName}`, 125, 52);
  doc.text(`AWB / Tracking: ${trackingNo}`, 125, 57);
  doc.text(`Total Items: ${totalQty} unit(s)`, 125, 62);

  // Calculate start Y for item table
  const addressHeight = splitAddress.length * 4.5;
  const startTableY = Math.max(78, 62 + addressHeight + 4);

  // Clean Packing Item Table with SKU / Product Code
  const tableColumn = ["S.No.", "SKU / Code", "Item Description", "Variant Details", "Qty"];
  
  const tableRows = (order.order_items || []).map((item, index) => {
    // Determine SKU
    let sku = item.variant?.sku || item.sku || item.product?.sku || "";
    if (!sku) {
      // Auto-generate clean warehouse SKU fallback (e.g., CCP-PBH-38)
      const nameCode = (item.product?.name || "ITEM").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 4);
      const sizeStr = item.variant?.size ? `-${item.variant.size}` : "";
      sku = `CCP-${nameCode}${sizeStr}`;
    }

    const details = [];
    if (item.variant?.size) details.push(`Size: ${item.variant.size}`);
    if (item.variant?.color) details.push(`Color: ${item.variant.color}`);
    if (item.product?.color && !item.variant?.color) details.push(`Color: ${item.product.color}`);

    return [
      index + 1,
      sku,
      item.product?.name || "Product Item",
      details.join(" • ") || "Standard",
      item.quantity || 1
    ];
  });

  autoTable(doc, {
    startY: startTableY,
    head: [tableColumn],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 3.5, halign: "left" },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 40, fontStyle: "bold" },
      2: { cellWidth: 70 },
      3: { cellWidth: 45 },
      4: { cellWidth: 15, halign: "center" }
    }
  });

  const finalY = doc.lastAutoTable.finalY || 140;

  // Clean Brand Footer Box
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, finalY + 12, 182, 18, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text("Thank you for choosing CACAPO!", 18, finalY + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("For returns, exchanges, or support, visit cacapoclothing.com/account or email support@cacapoclothing.com.", 18, finalY + 24);

  doc.save(`CACAPO_PackagingSlip_${order.order_number}.pdf`);
}

/**
 * Generates and downloads native 100mm x 150mm (4" x 6") thermal packaging slip
 * specifically formatted for desktop barcode thermal label printers (Honeywell IH-2, TVS, Zebra, TSC).
 * @param {Object} order - Order object
 */
export async function generatePackagingSlipThermal(order) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  // 100mm wide x 150mm high
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [100, 150]
  });

  const orderNo = order.order_number || "ORD";
  const createdDate = new Date(order.created_at || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const payMethod = (order.payment_method || "COD").toUpperCase();
  const payStatus = (order.payment_status || "PENDING").toUpperCase();

  // Header Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("PACKAGING SLIP", 5, 8);

  doc.setFontSize(10);
  doc.text(`#${orderNo}`, 95, 8, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${createdDate} | Pay: ${payMethod} (${payStatus})`, 5, 12);
  doc.text("CACAPO Warehouse Dispatch", 95, 12, { align: "right" });

  // Divider Line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(5, 14, 95, 14);

  // Address & Courier Block
  const shipping = order.shipping_address || {};
  const customerName = (shipping.full_name || shipping.name || "Customer").toUpperCase();
  const phone = shipping.phone || "N/A";
  const addressParts = [
    shipping.address_line1 || shipping.street,
    shipping.address_line2,
    shipping.city,
    shipping.state ? `${shipping.state}${shipping.pincode ? ' - ' + shipping.pincode : ''}` : shipping.pincode
  ].filter(Boolean).join(", ");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text("DELIVER TO:", 5, 18);

  doc.setFontSize(8);
  doc.text(customerName.slice(0, 32), 5, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`Phone: ${phone}`, 5, 25.5);

  const splitAddr = doc.splitTextToSize(addressParts || "Address on file", 48);
  doc.text(splitAddr.slice(0, 3), 5, 29);

  // Courier Info on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("SHIPMENT DETAILS:", 56, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const courier = shipping.courier_name || order.courier_name || "Shiprocket Express";
  const tracking = shipping.tracking_no || order.tracking_number || shipping.awb_code || "Pending";
  const totalUnits = (order.order_items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

  doc.text(`Courier: ${courier}`, 56, 22);
  doc.text(`AWB: ${tracking}`, 56, 25.5);
  doc.text(`Units: ${totalUnits} item(s)`, 56, 29);

  const addrHeight = Math.min(splitAddr.length, 3) * 3;
  const tableStartY = Math.max(38, 29 + addrHeight + 3);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(5, tableStartY - 2, 95, tableStartY - 2);

  // Items Table
  const tableColumn = ["#", "Product & SKU Details", "Qty", "Check"];
  const tableRows = (order.order_items || []).map((item, idx) => {
    let sku = item.variant?.sku || item.sku || item.product?.sku || "";
    if (!sku && item.product?.name) {
      const nameCode = item.product.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 4);
      const sizeStr = item.variant?.size ? `-${item.variant.size}` : "";
      sku = `CCP-${nameCode}${sizeStr}`;
    } else if (!sku) {
      sku = "CCP-ITEM";
    }

    const pName = item.product?.name || "Apparel Item";
    const variantDesc = [
      item.variant?.size ? `Size: ${item.variant.size}` : "",
      item.variant?.color ? `Color: ${item.variant.color}` : (item.product?.color ? `Color: ${item.product.color}` : "")
    ].filter(Boolean).join(" • ");

    const descCell = `${pName}\nSKU: ${sku}${variantDesc ? '\n' + variantDesc : ''}`;

    return [
      idx + 1,
      descCell,
      item.quantity || 1,
      "[   ]"
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [tableColumn],
    body: tableRows,
    theme: "grid",
    margin: { left: 5, right: 5 },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 1.5
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.15,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 62 },
      2: { cellWidth: 10, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 11, halign: "center" }
    }
  });

  const finalY = doc.lastAutoTable.finalY || 100;

  // Verification & Signoff Box
  const boxY = Math.min(finalY + 4, 126);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(5, boxY, 90, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("DISPATCH CHECKLIST & VERIFICATION:", 7, boxY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("[  ] Items Verified    [  ] Correct Size & Color    [  ] Sealed & Packed", 7, boxY + 8);
  doc.text("Packed By: ____________________     Date: _____/_____/2026", 7, boxY + 11.5);

  // Footer branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text("CACAPO • cacapoclothing.com • Support: +91 62386 76820", 50, 145, { align: "center" });

  doc.save(`CACAPO_Thermal_PackingSlip_${orderNo}.pdf`);
}

/**
 * Generates and downloads native 100mm x 150mm (4" x 6") thermal Bill of Supply / Tax Invoice
 * formatted specifically for desktop thermal barcode printers (Honeywell IH-2, TVS, Zebra, TSC).
 * @param {Object} order - Order object
 * @param {string} gstNumber - Store GSTIN
 */
export async function generateTaxInvoiceThermal(order, gstNumber = "") {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  // 100mm wide x 150mm high
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [100, 150]
  });

  const orderNo = order.order_number || "ORD";
  const createdDate = new Date(order.created_at || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const payMethod = (order.payment_method || "COD").toUpperCase();
  const payStatus = (order.payment_status || "PENDING").toUpperCase();
  const shipping = order.shipping_address || {};
  const placeOfSupplyStr = getPlaceOfSupply(shipping.state);

  // Header Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("CACAPO LLP", 5, 8);

  doc.setFontSize(9);
  doc.text(USE_COMPOSITION_GST ? "BILL OF SUPPLY" : "TAX INVOICE", 95, 8, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(60, 60, 60);
  doc.text("Melattur, Malappuram, Kerala - 679326" + (gstNumber ? ` | GSTIN: ${gstNumber}` : ""), 5, 11.5);
  doc.text("Original for Recipient", 95, 11.5, { align: "right" });

  doc.text("support@cacapoclothing.com | cacapoclothing.com", 5, 14.5);
  doc.text(`Place of Supply: ${placeOfSupplyStr}`, 95, 14.5, { align: "right" });

  // Divider Line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(5, 16.5, 95, 16.5);

  // Invoice & Customer Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice No: ${orderNo}`, 5, 20.5);
  doc.text(`Date: ${createdDate}`, 50, 20.5);
  doc.text(`Payment: ${payMethod} (${payStatus})`, 95, 20.5, { align: "right" });

  // Bill To / Ship To
  const customerName = (shipping.full_name || shipping.name || "Customer").toUpperCase();
  const phone = shipping.phone || "N/A";
  const addressParts = [
    shipping.address_line1 || shipping.street,
    shipping.address_line2,
    shipping.city,
    shipping.state ? `${shipping.state}${shipping.pincode ? ' - ' + shipping.pincode : ''}` : shipping.pincode
  ].filter(Boolean).join(", ");

  doc.text("BILL TO / SHIP TO:", 5, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(customerName.slice(0, 36), 5, 28.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`Phone: ${phone}`, 5, 32);

  const splitAddr = doc.splitTextToSize(`Address: ${addressParts || 'N/A'}`, 90);
  doc.text(splitAddr.slice(0, 2), 5, 35.5);

  const addrHeight = Math.min(splitAddr.length, 2) * 3.5;
  const tableStartY = Math.max(40, 35.5 + addrHeight + 1.5);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(5, tableStartY - 1.5, 95, tableStartY - 1.5);

  // Items Table
  const tableColumn = ["#", "Product Description & SKU", "Qty", "Price", "Total"];
  const tableRows = (order.order_items || []).map((item, idx) => {
    const grossPrice = item.price || 0;
    const qty = item.quantity || 1;
    const lineTotal = (grossPrice * qty) / 100;
    
    let sku = item.variant?.sku || item.sku || item.product?.sku || "";
    if (!sku && item.product?.name) {
      const nameCode = item.product.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 4);
      const sizeStr = item.variant?.size ? `-${item.variant.size}` : "";
      sku = `CCP-${nameCode}${sizeStr}`;
    }

    const pName = item.product?.name || "Product Item";
    const variantStr = item.variant?.size
      ? `Size: ${item.variant.size}${item.variant?.color ? ' • ' + item.variant.color : ''}`
      : (item.product?.color ? `Color: ${item.product.color}` : "");

    const descCell = `${pName}\nSKU: ${sku}${variantStr ? ' • ' + variantStr : ''}`;

    return [
      idx + 1,
      descCell,
      qty,
      (grossPrice / 100).toFixed(2),
      lineTotal.toFixed(2)
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [tableColumn],
    body: tableRows,
    theme: "grid",
    margin: { left: 5, right: 5 },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      cellPadding: 1.5
    },
    styles: {
      fontSize: 6,
      cellPadding: 1.8,
      lineColor: [200, 200, 200],
      lineWidth: 0.15,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 47 },
      2: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 13, halign: "right" },
      4: { cellWidth: 13, halign: "right", fontStyle: "bold" }
    }
  });

  const finalY = doc.lastAutoTable.finalY || 95;

  // Summary Card on Right
  const subtotalRupees = (order.subtotal || (order.total_amount - (order.shipping_charge || 0))) / 100;
  const discountRupees = (order.discount || 0) / 100;
  const shippingRupees = (order.shipping_charge || 0) / 100;
  const totalRupees = (order.total_amount || 0) / 100;

  let sumY = finalY + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(60, 60, 60);

  doc.text(`Subtotal: Rs. ${subtotalRupees.toFixed(2)}`, 95, sumY, { align: "right" });
  if (discountRupees > 0) {
    sumY += 3.5;
    doc.text(`Discount: -Rs. ${discountRupees.toFixed(2)}`, 95, sumY, { align: "right" });
  }
  sumY += 3.5;
  doc.text(`Shipping: Rs. ${shippingRupees.toFixed(2)}`, 95, sumY, { align: "right" });
  
  sumY += 3.5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6);
  doc.text("(All prices are inclusive of taxes)", 95, sumY, { align: "right" });

  sumY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Amount Paid: Rs. ${totalRupees.toFixed(2)}`, 95, sumY, { align: "right" });

  // Bottom Notice & Return Policy
  const policyY = Math.max(sumY + 6, 134);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(90, 90, 90);
  doc.text("• Return / exchange eligible within 7 days in original packaging with tags intact.", 5, policyY);
  doc.text("• This is a computer-generated Bill of Supply and does not require a physical signature.", 5, policyY + 3);

  // Footer branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text("CACAPO Clothing • cacapoclothing.com • Melattur, Malappuram", 50, 145, { align: "center" });

  doc.save(`CACAPO_Thermal_Bill_${orderNo}.pdf`);
}
