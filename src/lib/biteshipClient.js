const getApiBase = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("vercel.app") || hostname.includes("bjsracing.com")) {
      return window.location.origin;
    }
    if (window.__API_BASE__) {
      return window.__API_BASE__;
    }
  }
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
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

export async function getBjsExpressAreas() {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/bjs-express-areas`);
  if (!res.ok) throw new Error("Gagal memuat area BJS Express.");
  return res.json();
}

export async function createBjsExpressArea(payload) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/bjs-express-areas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Gagal menambah area BJS Express.");
  return res.json();
}

export async function updateBjsExpressArea(id, payload) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/bjs-express-areas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal memperbarui area BJS Express. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function deleteBjsExpressArea(id) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/bjs-express-areas/${id}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal menghapus area BJS Express. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function bulkCreateBjsExpressArea(payload) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/bjs-express-areas/bulk-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal bulk import desa. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function searchBiteshipAreas(query) {
  const res = await fetch(`${API_BASE}/api/shipping/biteship/search-area?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Gagal mencari area.");
  return res.json();
}

export async function getCourierConfig() {
  const res = await fetch(`${API_BASE}/api/shipping/courier-config`);
  if (!res.ok) throw new Error("Gagal memuat konfigurasi kurir.");
  return res.json();
}

export async function getCouriers() {
  const res = await fetch(`${API_BASE}/api/couriers`);
  if (!res.ok) throw new Error("Gagal memuat data kurir.");
  return res.json();
}

export async function createCourier(payload) {
  const res = await fetch(`${API_BASE}/api/couriers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal menambah kurir. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function updateCourier(id, payload) {
  const res = await fetch(`${API_BASE}/api/couriers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal memperbarui kurir. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function deleteCourier(id) {
  const res = await fetch(`${API_BASE}/api/couriers/${id}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal menghapus kurir. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function getBjsExpressOrders(status = "paid,shipped") {
  const res = await fetch(`${API_BASE}/api/bjs-express/orders?status=${encodeURIComponent(status)}`);
  if (!res.ok) throw new Error("Gagal memuat pesanan BJS Express.");
  return res.json();
}

export async function assignCourierToOrder(payload) {
  const res = await fetch(`${API_BASE}/api/bjs-express/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal menugaskan kurir. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function cancelBjsExpressAssignment(order_id, reason) {
  const res = await fetch(`${API_BASE}/api/bjs-express/cancel-assignment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id, reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal membatalkan penugasan. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function fetchRajaOngkirSubdistricts(districtName, cityName) {
  const res = await fetch(`${API_BASE}/api/shipping/rajaongkir/subdistricts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ district_name: districtName, city_name: cityName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal mengambil daftar desa dari RajaOngkir. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}
