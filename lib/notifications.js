// File: lib/notifications.js
// Helper notifikasi WhatsApp untuk Vercel Functions POS (Fonnte/WaBlas/WaAPI).
// Meniru logika di store (src/lib/notifications.ts) agar template konsisten.

const STORE_BASE_URL = process.env.STORE_PUBLIC_URL || "https://bjs-racing-store.vercel.app";

function normalizePhone(num) {
  let clean = String(num || "").replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) clean = "62" + clean.slice(1);
  return clean;
}

const EVENT_TEMPLATES = {
  order_shipped: (d) =>
    `Halo ${d.customerName || "Customer"}!\n\n` +
    `Pesanan ${d.orderNumber} sudah dikirim via ${d.courierName || "kurir"}. ` +
    `Estimasi tiba: ${d.etd || "akan diinfokan"}\n\n` +
    `Lacak: ${d.trackingUrl || "-"}\n\n` +
    `Terima kasih,\n${d.storeName || "BJS Racing Store"}`,
  order_completed: (d) =>
    `Halo ${d.customerName || "Customer"}!\n\n` +
    `Pesanan ${d.orderNumber} telah sampai. ` +
    `Terima kasih telah berbelanja di ${d.storeName || "BJS Racing Store"}.\n\n` +
    (d.trackingUrl ? `Detail: ${d.trackingUrl}\n\n` : "") +
    `Kami tunggu order Anda selanjutnya!`,
  shipping_status_update: (d) =>
    `Halo ${d.customerName || "Customer"}!\n\n` +
    `Status pengiriman pesanan ${d.orderNumber} diperbarui: ${d.shippingStatus || "sedang diproses"}.\n\n` +
    `Terima kasih,\n${d.storeName || "BJS Racing Store"}`,
};

async function sendFonnte(payload) {
  const apiKey = process.env.FONNTE_API_KEY;
  const sender = process.env.FONNTE_SENDER_NUMBER;
  if (!apiKey || !sender) {
    return { success: false, message: "FONNTE credentials tidak dikonfigurasi.", provider: "fonnte" };
  }

  const template = EVENT_TEMPLATES[payload.event]?.(payload.data);
  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: normalizePhone(payload.to),
      message: template,
      sender,
      countryCode: "62",
    }),
  });

  const result = await response.json();
  if (!response.ok || result.status !== true) {
    return { success: false, message: result.reason || "Gagal mengirim WhatsApp via FONNTE.", provider: "fonnte" };
  }

  return { success: true, provider: "fonnte" };
}

async function sendWablas(payload) {
  const baseUrl = process.env.WABLAS_BASE_URL;
  const apiKey = process.env.WABLAS_API_KEY;
  if (!baseUrl || !apiKey) {
    return { success: false, message: "Wablas credentials tidak dikonfigurasi.", provider: "wablas" };
  }

  const template = EVENT_TEMPLATES[payload.event]?.(payload.data);
  const response = await fetch(`${baseUrl}/api/v2/send-message`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ phone: payload.to, message: template }),
  });

  const result = await response.json();
  if (!response.ok || result.status !== true) {
    return { success: false, message: result.message || "Gagal mengirim WhatsApp via Wablas.", provider: "wablas" };
  }
  return { success: true, provider: "wablas" };
}

async function sendWaApi(payload) {
  const baseUrl = process.env.WAAPI_BASE_URL;
  const apiKey = process.env.WAAPI_API_KEY;
  if (!baseUrl || !apiKey) {
    return { success: false, message: "WaAPI credentials tidak dikonfigurasi.", provider: "waapi" };
  }

  const template = EVENT_TEMPLATES[payload.event]?.(payload.data);
  const response = await fetch(`${baseUrl}/api/send-message`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: payload.to, message: template }),
  });

  const result = await response.json();
  if (!response.ok || result.status !== true) {
    return { success: false, message: result.message || "Gagal mengirim WhatsApp via WaAPI.", provider: "waapi" };
  }
  return { success: true, provider: "waapi" };
}

export async function sendOrderNotification(payload) {
  const provider = (process.env.WHATSAPP_PROVIDER || "").toLowerCase();
  if (provider === "fonnte") return sendFonnte(payload);
  if (provider === "wablas") return sendWablas(payload);
  if (provider === "waapi") return sendWaApi(payload);
  return { success: false, message: "WhatsApp provider tidak dikonfigurasi. Set WHATSAPP_PROVIDER=fonnte, wablas atau waapi." };
}

export { STORE_BASE_URL, normalizePhone };
