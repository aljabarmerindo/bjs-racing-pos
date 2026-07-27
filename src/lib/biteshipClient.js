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

const withTimeout = (promise, timeoutMs = 10000, label = "") => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timeout setelah ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const fetchWithTimeout = (url, options = {}, timeoutMs = 10000, label = "") => {
  return withTimeout(
    fetch(url, { ...options, cache: "no-store" }),
    timeoutMs,
    label
  );
};

export async function getGojekAreas() {
  const res = await fetchWithTimeout(`${API_BASE}/api/shipping/biteship/gojek-areas`, {}, 10000, "GET gojek-areas");
  if (!res.ok) throw new Error("Gagal memuat area GOJEK.");
  return withTimeout(res.json(), 10000, "parse gojek-areas JSON");
}

export async function createGojekArea(payload) {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/shipping/biteship/gojek-areas`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    10000,
    "POST gojek-areas"
  );
  if (!res.ok) throw new Error("Gagal menambah area GOJEK.");
  return withTimeout(res.json(), 10000, "parse create gojek-area JSON");
}

export async function updateGojekArea(id, payload) {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/shipping/biteship/gojek-areas/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    10000,
    "PUT gojek-areas"
  );
  const data = await withTimeout(res.json(), 10000, "parse update gojek-area JSON").catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal memperbarui area GOJEK. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function deleteGojekArea(id) {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/shipping/biteship/gojek-areas/${id}`,
    { method: "DELETE" },
    10000,
    "DELETE gojek-areas"
  );
  const data = await withTimeout(res.json(), 10000, "parse delete gojek-area JSON").catch(() => ({}));
  if (!res.ok) throw new Error(`Gagal menghapus area GOJEK. [${res.status}] ${data.message || data.details || JSON.stringify(data)}`);
  return data;
}

export async function searchBiteshipAreas(query) {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/shipping/biteship/search-area?q=${encodeURIComponent(query)}`,
    {},
    10000,
    "GET search-area"
  );
  if (!res.ok) throw new Error("Gagal mencari area.");
  return withTimeout(res.json(), 10000, "parse search-area JSON");
}
