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

/**
 * Main function to generate and download Tax Invoice PDF for an order.
 * @param {Object} order - Order object from database
 * @param {string} gstNumber - Store GSTIN setting
 */
export async function generateTaxInvoice(order, gstNumber = "") {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Store Branding Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(24, 24, 27); // Dark zinc
  doc.text("CACAPO", 14, 18);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("CACAPO Store, Perinthalmanna, Kerala - 679322", 14, 24);
  if (gstNumber) {
    doc.text(`GSTIN: ${gstNumber}`, 14, 29);
  }
  doc.text("Email: support@cacapo.com | Website: www.cacapo.com", 14, gstNumber ? 34 : 29);

  // Document Title & Invoice Copy Label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("TAX INVOICE", 135, 18);

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

  const tableColumn = ["S.No.", "Product Description", "HSN/SAC", "Variant", "Qty", "Gross Rate", "Taxable Val", "GST Rate", "GST Amt", "Total (INR)"];
  
  const tableRows = (order.order_items || []).map((item, index) => {
    const grossPrice = item.price || 0; // in paise
    const rate = grossPrice > 249900 ? 18 : 5; // GST rate
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
    columnStyles: {
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
  doc.text("• To initiate a return or view full policy, visit www.cacapo.com/account or contact support@cacapo.com.", 17, footerY + 15);

  footerY += 26;

  // Declaration Block
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Declaration: This is a system-generated tax invoice and does not require a physical signature.", 14, footerY + 8);

  // Save the generated PDF
  doc.save(`CACAPO_TaxInvoice_${order.order_number}.pdf`);
}

/**
 * Main function to generate and download Packaging Slip PDF for warehouse fulfillment.
 * @param {Object} order - Order object from database
 */
export async function generatePackagingSlip(order) {
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
  doc.text("For returns, exchanges, or support, visit www.cacapo.com/account or email support@cacapo.com.", 18, finalY + 24);

  doc.save(`CACAPO_PackagingSlip_${order.order_number}.pdf`);
}
