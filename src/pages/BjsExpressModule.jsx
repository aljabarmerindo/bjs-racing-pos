// File: src/pages/BjsExpressModule.jsx
// Modul manajemen BJS Express (kurir internal):
//  - Tab Area Layanan (kelola area + tarif flat)
//  - Tab Data Kurir (CRUD kurir + akun login)
//  - Tab Penugasan (tugaskan kurir ke pesanan BJS Express)
import { useState, useEffect } from "react";
import BjsExpressAreas from "./BjsExpressAreas.jsx";
import {
  getCouriers,
  createCourier,
  updateCourier,
  deleteCourier,
  getBjsExpressOrders,
  assignCourierToOrder,
} from "../lib/biteshipClient.js";

const formatRupiah = (number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number || 0);

const formatTanggal = (dateString) =>
  new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const assignmentStatusColors = {
  assigned: "bg-blue-100 text-blue-800",
  picked: "bg-indigo-100 text-indigo-800",
  in_transit: "bg-purple-100 text-purple-800",
  dropping_off: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function CourierModal({ isOpen, onClose, onSave, courierToEdit }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    plate_number: "",
    vehicle_type: "motor",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (courierToEdit) {
      setForm({
        name: courierToEdit.name || "",
        email: "",
        password: "",
        phone: courierToEdit.phone || "",
        plate_number: courierToEdit.plate_number || "",
        vehicle_type: courierToEdit.vehicle_type || "motor",
        is_active: courierToEdit.is_active ?? true,
      });
    } else {
      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        plate_number: "",
        vehicle_type: "motor",
        is_active: true,
      });
    }
  }, [courierToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      alert("Gagal menyimpan kurir: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {courierToEdit ? "Edit Kurir" : "Tambah Kurir"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          {!courierToEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Akun Login
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Kurir bisa login ke aplikasi kurir"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password Akun Login
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Wajib jika email diisi"
                />
              </div>
            </>
          )}
          {courierToEdit && courierToEdit.user_id && (
            <p className="text-xs text-green-600 bg-green-50 p-2 rounded">
              Akun login sudah terhubung.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                No. HP
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                No. Plat Kendaraan
              </label>
              <input
                type="text"
                value={form.plate_number}
                onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="cth: K 1234 AB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Jenis Kendaraan
              </label>
              <select
                value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="motor">Motor</option>
                <option value="mobil">Mobil</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="courier_is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="courier_is_active" className="text-sm font-medium text-slate-700">
                Aktif
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-400"
            >
              {courierToEdit ? "Simpan Perubahan" : "Tambah Kurir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CourierTab() {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courierToEdit, setCourierToEdit] = useState(null);

  const loadCouriers = async () => {
    setLoading(true);
    try {
      const data = await getCouriers();
      setCouriers(data);
    } catch (err) {
      alert("Gagal memuat data kurir: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCouriers();
  }, []);

  const handleSave = async (form) => {
    if (courierToEdit) {
      await updateCourier(courierToEdit.id, {
        name: form.name,
        phone: form.phone,
        plate_number: form.plate_number,
        vehicle_type: form.vehicle_type,
        is_active: form.is_active,
      });
    } else {
      await createCourier(form);
    }
    await loadCouriers();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus kurir ini?")) return;
    try {
      await deleteCourier(id);
      await loadCouriers();
    } catch (err) {
      alert("Gagal menghapus kurir: " + err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Data Kurir Internal</h2>
        <button
          onClick={() => {
            setCourierToEdit(null);
            setIsModalOpen(true);
          }}
          className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kurir
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-bold">Daftar Kurir</h3>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-500">Memuat...</p>
        ) : couriers.length === 0 ? (
          <p className="p-6 text-center text-slate-500">
            Belum ada kurir. Tambahkan kurir beserta akun loginnya.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Nama</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">No. HP</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Kendaraan</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Plat Nomor</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Akun Login</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {couriers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{c.name}</td>
                    <td className="px-6 py-4">{c.phone || "-"}</td>
                    <td className="px-6 py-4 capitalize">{c.vehicle_type || "motor"}</td>
                    <td className="px-6 py-4">{c.plate_number || "-"}</td>
                    <td className="px-6 py-4">
                      {c.user_id ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Terhubung
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          Tanpa login
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {c.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setCourierToEdit(c);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CourierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        courierToEdit={courierToEdit}
      />
    </div>
  );
}

function PenugasanTab() {
  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("paid,shipped");
  const [assigningId, setAssigningId] = useState(null);
  const [assignMap, setAssignMap] = useState({});
  const [noteMap, setNoteMap] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, couriersData] = await Promise.all([
        getBjsExpressOrders(statusFilter),
        getCouriers(),
      ]);
      setOrders(ordersData);
      setCouriers(couriersData.filter((c) => c.is_active));
    } catch (err) {
      alert("Gagal memuat data penugasan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleAssign = async (order) => {
    const courierId = assignMap[order.id];
    if (!courierId) {
      alert("Pilih kurir terlebih dahulu.");
      return;
    }
    setAssigningId(order.id);
    try {
      await assignCourierToOrder({
        order_id: order.id,
        courier_id: courierId,
        notes: noteMap[order.id] || null,
      });
      await loadData();
    } catch (err) {
      alert("Gagal menugaskan kurir: " + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm items-start md:items-center">
        <h2 className="text-xl font-bold">Penugasan Kurir</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ml-auto p-2 border rounded-md"
        >
          <option value="paid,shipped">Belum & Sudah Ditugaskan</option>
          <option value="paid">Belum Ditugaskan</option>
          <option value="shipped">Sudah Ditugaskan</option>
          <option value="completed">Selesai</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-bold">Daftar Pesanan BJS Express</h3>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-500">Memuat...</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-center text-slate-500">
            Tidak ada pesanan BJS Express dengan status ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">No. Pesanan</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Tanggal</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Pelanggan</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Alamat</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Total</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Kurir</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((order) => {
                  const assignment = order.courier_assignments?.[0] || null;
                  const assignedCourier = assignment?.couriers || null;
                  const isCompleted = order.status === "completed";
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 align-top">
                      <td className="px-6 py-4 font-medium">{order.order_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatTanggal(order.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{order.customers?.nama_pelanggan || "-"}</div>
                        <div className="text-xs text-slate-500">{order.customers?.telepon || ""}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-xs text-slate-600">
                          {order.shipping_address?.full_address ||
                            order.shipping_address?.address ||
                            JSON.stringify(order.shipping_address || {}).slice(0, 120)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatRupiah(order.total_amount)}</td>
                      <td className="px-6 py-4">
                        {assignedCourier ? (
                          <div>
                            <div className="font-medium">{assignedCourier.name}</div>
                            <div className="text-xs text-slate-500">{assignedCourier.phone || ""}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Belum ditugaskan</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            assignmentStatusColors[assignment?.status] || "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {assignment?.status || (isCompleted ? "completed" : "belum ditugaskan")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isCompleted ? (
                          <span className="text-xs text-slate-400">Selesai</span>
                        ) : assignment ? (
                          <div className="flex flex-col gap-2 w-56">
                            <select
                              value={assignMap[order.id] || assignment.courier_id || ""}
                              onChange={(e) =>
                                setAssignMap((m) => ({ ...m, [order.id]: e.target.value }))
                              }
                              className="p-2 border rounded-md text-sm"
                            >
                              <option value="">Ganti kurir...</option>
                              {couriers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssign(order)}
                              disabled={assigningId === order.id}
                              className="bg-blue-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 text-xs"
                            >
                              {assigningId === order.id ? "Menyimpan..." : "Perbarui Penugasan"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-56">
                            <select
                              value={assignMap[order.id] || ""}
                              onChange={(e) =>
                                setAssignMap((m) => ({ ...m, [order.id]: e.target.value }))
                              }
                              className="p-2 border rounded-md text-sm"
                            >
                              <option value="">Pilih kurir...</option>
                              {couriers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Catatan (opsional)"
                              value={noteMap[order.id] || ""}
                              onChange={(e) =>
                                setNoteMap((m) => ({ ...m, [order.id]: e.target.value }))
                              }
                              className="p-2 border rounded-md text-sm"
                            />
                            <button
                              onClick={() => handleAssign(order)}
                              disabled={assigningId === order.id}
                              className="bg-green-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-green-700 disabled:bg-slate-400 text-xs"
                            >
                              {assigningId === order.id ? "Menyimpan..." : "Tugaskan Kurir"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BjsExpressModule() {
  const [activeTab, setActiveTab] = useState("area");

  const tabs = [
    { key: "area", label: "Area Layanan" },
    { key: "kurir", label: "Data Kurir" },
    { key: "penugasan", label: "Penugasan" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="text-orange-600 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m0 0l6 3m-6-3V7m6 10l-5.447-2.724A1 1 0 0013.553 13H9.447a1 1 0 00-1.447.894L9 15m0 0l6 3" />
        </svg>
        BJS Express
      </h1>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-4 rounded-t-lg font-semibold text-sm transition-colors ${
              activeTab === tab.key
                ? "bg-white text-orange-600 border-b-2 border-orange-500"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "area" && <BjsExpressAreas />}
      {activeTab === "kurir" && <CourierTab />}
      {activeTab === "penugasan" && <PenugasanTab />}
    </div>
  );
}
