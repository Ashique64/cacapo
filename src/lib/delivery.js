import { supabase } from "./supabase";

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

/**
 * Gets a valid Shiprocket authentication token.
 * If credentials are not present, returns a sandbox mock token.
 */
async function getAuthToken() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    // Return mock token for sandbox/development fallback
    return "MOCK_DEVELOPMENT_TOKEN";
  }

  try {
    // Check if we have a cached valid token in database settings to save API overhead
    const { data: cachedTokenData } = await supabase
      .from("store_settings")
      .select("value, updated_at")
      .eq("key", "shiprocket_token")
      .maybeSingle();

    if (cachedTokenData && cachedTokenData.value) {
      const updatedAt = new Date(cachedTokenData.updated_at).getTime();
      const ageHours = (Date.now() - updatedAt) / (1000 * 60 * 60);
      // Shiprocket tokens are valid for 10 days, refresh if older than 24 hours to be safe
      if (ageHours < 24) {
        return cachedTokenData.value;
      }
    }

    const res = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error(`Authentication failed with status ${res.status}`);
    }

    const json = await res.json();
    const token = json.token;

    if (token) {
      // Cache token in settings database
      await supabase.from("store_settings").upsert({
        key: "shiprocket_token",
        value: token,
        description: "Cached Shiprocket JWT Token",
        updated_at: new Date().toISOString()
      });
      return token;
    }
  } catch (err) {
    console.warn("Failed to retrieve live Shiprocket auth token, falling back to mock:", err.message);
  }

  return "MOCK_DEVELOPMENT_TOKEN";
}

/**
 * Checks serviceability for delivery or reverse pickup.
 */
export async function checkServiceability(pincode, isReturn = false) {
  const token = await getAuthToken();

  if (token === "MOCK_DEVELOPMENT_TOKEN") {
    // Sandbox Mock Response
    return {
      status: true,
      message: "Mock Serviceability Check Succeeded",
      data: {
        cod: 1,
        prepaid: 1,
        courier_name: "Mock Blue Dart Express",
        expected_delivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN")
      }
    };
  }

  try {
    // For live checked serviceability, fetch details between warehouse (origin) pincode and target pincode
    // Assume origin pincode is set in store settings, fallback to standard Delhi pincode
    const { data: originSetting } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "warehouse_pincode")
      .maybeSingle();
    const origin = originSetting?.value || "110001";

    const url = `${SHIPROCKET_BASE_URL}/courier/serviceability?pickup_postcode=${origin}&delivery_postcode=${pincode}&cod=${isReturn ? 0 : 1}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) throw new Error("Serviceability API request failed");
    const json = await res.json();
    return {
      status: json.status === 200,
      data: json.data || null,
      message: json.message || ""
    };
  } catch (err) {
    console.error("Shiprocket serviceability error:", err);
    return { status: false, error: err.message };
  }
}

/**
 * Creates a forward shipment/order in Shiprocket.
 */
export async function createShipment(orderData) {
  const token = await getAuthToken();

  if (token === "MOCK_DEVELOPMENT_TOKEN") {
    return {
      status: true,
      order_id: "MOCK-SR-" + Math.floor(Math.random() * 100000),
      shipment_id: "MOCK-SH-" + Math.floor(Math.random() * 100000),
      awb_code: "MOCKAWB" + Math.floor(Math.random() * 10000000),
      courier_name: "Mock Delhivery Express"
    };
  }

  try {
    const payload = {
      order_id: orderData.order_number,
      order_date: new Date(orderData.created_at).toISOString().split("T")[0],
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary Warehouse",
      billing_customer_name: orderData.shipping_address.full_name,
      billing_last_name: "",
      billing_address: orderData.shipping_address.address_line1,
      billing_address_2: orderData.shipping_address.address_line2 || "",
      billing_city: orderData.shipping_address.city,
      billing_pincode: orderData.shipping_address.pincode,
      billing_state: orderData.shipping_address.state,
      billing_country: "India",
      billing_email: orderData.shipping_address.email || "support@cacapo.com",
      billing_phone: orderData.shipping_address.phone,
      shipping_is_billing: true,
      order_items: orderData.order_items.map(item => ({
        name: item.product?.name || "Apparel Item",
        sku: item.variant?.sku || item.product?.sku || "SKU-GEN",
        units: item.quantity,
        selling_price: (item.price / 100).toString(),
        discount: "0"
      })),
      payment_method: orderData.payment_method === "cod" ? "COD" : "Prepaid",
      sub_total: (orderData.subtotal / 100).toString(),
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5
    };

    const res = await fetch(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Order creation failed on Shiprocket");
    const json = await res.json();
    return {
      status: true,
      order_id: json.order_id,
      shipment_id: json.shipment_id,
      awb_code: json.awb_code || null,
      courier_name: json.courier_name || null
    };
  } catch (err) {
    console.error("Shiprocket create shipment error:", err);
    return { status: false, error: err.message };
  }
}

/**
 * Schedules a courier pickup for a shipment.
 */
export async function schedulePickup(shipmentId, date) {
  const token = await getAuthToken();

  if (token === "MOCK_DEVELOPMENT_TOKEN") {
    return {
      status: true,
      pickup_id: "MOCK-PK-" + Math.floor(Math.random() * 100000),
      pickup_scheduled_date: date
    };
  }

  try {
    const res = await fetch(`${SHIPROCKET_BASE_URL}/courier/generate/pickup`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        shipment_id: [shipmentId],
        pickup_date: [date]
      })
    });

    if (!res.ok) throw new Error("Pickup scheduling failed");
    const json = await res.json();
    return {
      status: json.pickup_status === 1,
      pickup_id: json.pickup_id || null,
      pickup_scheduled_date: json.pickup_scheduled_date || date
    };
  } catch (err) {
    console.error("Shiprocket pickup schedule error:", err);
    return { status: false, error: err.message };
  }
}

/**
 * Generates and fetches the PDF label download URL for shipping.
 */
export async function generateLabel(shipmentId) {
  const token = await getAuthToken();

  if (token === "MOCK_DEVELOPMENT_TOKEN") {
    return {
      status: true,
      label_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    };
  }

  try {
    const res = await fetch(`${SHIPROCKET_BASE_URL}/courier/generate/label`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ shipment_id: [shipmentId] })
    });

    if (!res.ok) throw new Error("Label generation failed");
    const json = await res.json();
    return {
      status: json.label_created === 1,
      label_url: json.label_url || null
    };
  } catch (err) {
    console.error("Shiprocket label generation error:", err);
    return { status: false, error: err.message };
  }
}

/**
 * Requests a reverse return pickup (Reverse Logistics) from the customer.
 */
export async function requestReturnPickup(orderData, returnRequest) {
  const token = await getAuthToken();

  if (token === "MOCK_DEVELOPMENT_TOKEN") {
    return {
      status: true,
      return_order_id: "MOCK-RET-" + Math.floor(Math.random() * 100000),
      return_shipment_id: "MOCK-RSH-" + Math.floor(Math.random() * 100000)
    };
  }

  try {
    const payload = {
      order_id: `${orderData.order_number}-RET`,
      order_date: new Date().toISOString().split("T")[0],
      pickup_customer_name: orderData.shipping_address.full_name,
      pickup_address: orderData.shipping_address.address_line1,
      pickup_address_2: orderData.shipping_address.address_line2 || "",
      pickup_city: orderData.shipping_address.city,
      pickup_pincode: orderData.shipping_address.pincode,
      pickup_state: orderData.shipping_address.state,
      pickup_country: "India",
      pickup_phone: orderData.shipping_address.phone,
      pickup_email: orderData.shipping_address.email || "support@cacapo.com",
      shipping_customer_name: process.env.RETURN_SHIPPING_NAME || "CACAPO Return Desk",
      shipping_address: process.env.RETURN_SHIPPING_ADDRESS || "123 Couture Plaza, Fashion District",
      shipping_city: process.env.RETURN_SHIPPING_CITY || "New Delhi",
      shipping_pincode: process.env.RETURN_SHIPPING_PINCODE || "110001",
      shipping_state: process.env.RETURN_SHIPPING_STATE || "Delhi",
      shipping_country: process.env.RETURN_SHIPPING_COUNTRY || "India",
      shipping_phone: process.env.RETURN_SHIPPING_PHONE || "+91 98765 43210",
      order_items: returnRequest.items.map(item => ({
        name: item.name || "Returned Product",
        sku: item.sku || "SKU-GEN-RET",
        units: item.quantity,
        selling_price: (item.price / 100).toString(),
        discount: "0"
      })),
      payment_method: "Prepaid",
      sub_total: (returnRequest.items.reduce((sum, i) => sum + (i.price * i.quantity), 0) / 100).toString(),
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5
    };

    const res = await fetch(`${SHIPROCKET_BASE_URL}/orders/create/return`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Reverse order return creation failed");
    const json = await res.json();
    return {
      status: true,
      return_order_id: json.order_id,
      return_shipment_id: json.shipment_id
    };
  } catch (err) {
    console.error("Shiprocket reverse pickup creation error:", err);
    return { status: false, error: err.message };
  }
}
