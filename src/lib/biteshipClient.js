const getApiBase = () => {
  if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
    return window.location.origin;
  }
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== "undefined" && window.__API_BASE__) {
    return window.__API_BASE__;
  }
  return "http://localhost:3001";
};

const API_BASE = getApiBase();

export async function getInternalRates(destinationId) {
  const res = await fetch(`${API_BASE}/api/shipping/internal/rates?destination_id=${encodeURIComponent(destinationId)}`);
  if (!res.ok) throw new Error("Gagal mengambil tarif internal.");
  return res.json();
}

export async function getBiteshipRates({ destination, weight, couriers }) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/rates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination, weight, couriers: couriers || "gojek,pos,jne,jnt,sicepat" }),
  });
  if (!res.ok) throw new Error("Gagal mengambil tarif Biteship.");
  return res.json();
}

export async function bookBiteshipOrder({ order_id, courier_company, courier_service_code, items, shipping_address, customer }) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id, courier_company, courier_service_code, items, shipping_address, customer }),
  });
  if (!res.ok) throw new Error("Gagal booking kurir Biteship.");
  return res.json();
}

export async function getGojekAreas() {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/gojek-areas`);
  if (!res.ok) throw new Error("Gagal memuat area GOJEK.");
  return res.json();
}

export async function createGojekArea(payload) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/gojek-areas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Gagal menambah area GOJEK.");
  return res.json();
}

export async function updateGojekArea(id, payload) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/gojek-areas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal memperbarui area GOJEK. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function deleteGojekArea(id) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/gojek-areas/${id}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal menghapus area GOJEK. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function searchBiteshipAreas(query) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/search-area?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Gagal mencari area.");
  return res.json();
}
