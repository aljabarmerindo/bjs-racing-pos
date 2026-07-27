// File: src/pages/DetailPesananOnline.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient"; // Sesuaikan path
import { FiLoader, FiXCircle } from "react-icons/fi";
import ShippingLabel from "../components/ShippingLabel.jsx";

// Helper functions (tetap sama)
const formatRupiah = (number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number || 0);
const formatTanggal = (dateString) =>
  new Date(dateString).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

const statusColors = {
  paid: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  completed: "bg-gray-200 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  awaiting_payment: "bg-yellow-100 text-yellow-800",
  pending: "bg-yellow-100 text-yellow-800",
};

// Komponen Modal Pelacakan (Baru)
const TrackingModal = ({ isOpen, onClose, trackingData, isLoading, error }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold text-lg">Riwayat Pelacakan</h3>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-800"
          >
            &times;
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center gap-2">
              <FiLoader className="animate-spin" />
              <span>Melacak...</span>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center gap-2 text-red-500 text-center">
              <FiXCircle size={24} />
              <span>{error}</span>
            </div>
          )}
          {trackingData && (
            <div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-gray-50 p-4 rounded-md">
                <div>
                  <p className="text-gray-500">No. Resi</p>
                  <p className="font-bold">
                    {trackingData.summary.waybill_number}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Kurir</p>
                  <p className="font-bold">
                    {trackingData.summary.courier_name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-bold capitalize">
                    {trackingData.summary.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Layanan</p>
                  <p className="font-bold">
                    {trackingData.summary.service_code}
                  </p>
                </div>
              </div>
              <ul className="space-y-4">
                {trackingData.manifest.map((item, index) => (
                  <li key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      {index < trackingData.manifest.length - 1 && (
                        <div className="w-0.5 flex-grow bg-gray-200"></div>
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-semibold text-gray-800">
                        {item.manifest_description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTanggal(
                          item.manifest_date + " " + item.manifest_time,
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function DetailPesananOnlinePage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [resiNumber, setResiNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // --- STATE BARU UNTUK PELACAKAN ---
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  const fetchOrderDetails = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        customers (nama_pelanggan, telepon),
        order_items (
          quantity,
          price,
          products (nama, sku, berat_gram)
        )
      `,
      )
      .eq("id", orderId)
      .single();

    if (error) {
      setError("Gagal memuat detail pesanan.");
      console.error(error);
    } else {
      setOrder(data);
      setNewStatus(data.status); // Atur state form sesuai data saat ini
      setResiNumber(data.shipping_receipt_number || "");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        shipping_receipt_number: resiNumber,
      })
      .eq("id", orderId);

    if (error) {
      alert("Gagal memperbarui pesanan: " + error.message);
    } else {
      alert("Pesanan berhasil diperbarui!");
      fetchOrderDetails(); // Muat ulang data untuk menampilkan perubahan
    }
    setIsSaving(false);
  };

  // --- FUNGSI BARU UNTUK MELACAK RESI ---
  const handleTrackShipment = async () => {
    if (!order?.shipping_receipt_number || !order?.courier_details?.code) {
      alert("Nomor resi atau kurir tidak tersedia.");
      return;
    }

    setIsTracking(true);
    setTrackingError(null);
    setTrackingData(null);
    setIsTrackingModalOpen(true);

    try {
      const awb = order.shipping_receipt_number;
      const courier = order.courier_details.code;

      // Panggil API di proyek Toko Online Anda
      const response = await fetch(
        `https://bjs-racing-store.vercel.app/api/shipping/track?awb=${awb}&courier=${courier}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal melacak resi.");
      }
      setTrackingData(result);
    } catch (err) {
      setTrackingError(err.message);
    } finally {
      setIsTracking(false);
    }
  };

  if (loading) return <div className="p-6">Memuat detail pesanan...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!order) return <div className="p-6">Pesanan tidak ditemukan.</div>;

  return (
    <>
      <div className="p-6 space-y-6">
        <Link
          to="/pesanan-online"
          className="text-blue-600 hover:underline flex items-center gap-2 w-fit"
        >
          &larr; Kembali ke Daftar Pesanan
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">
              Detail Pesanan #{order.order_number}
            </h1>
            <p className="text-gray-500">
              Tanggal: {formatTanggal(order.created_at)}
            </p>
          </div>
          <span
            className={`px-3 py-1.5 text-sm font-semibold rounded-full capitalize ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}
          >
            {order.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Rincian Item */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Rincian Item</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">Produk</th>
                    <th className="text-center pb-2">Kuantitas</th>
                    <th className="text-right pb-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items.map((item) => (
                    <tr key={item.products.sku}>
                      <td className="py-2">
                        {item.products.nama} ({item.products.sku})
                      </td>
                      <td className="text-center py-2">
                        {item.quantity} x {formatRupiah(item.price)}
                      </td>
                      <td className="text-right py-2 font-medium">
                        {formatRupiah(item.quantity * item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Detail Pelanggan & Pengiriman */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4">Pelanggan</h2>
                <p>{order.customers.nama_pelanggan}</p>
                <p>{order.customers.telepon}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4">Alamat Pengiriman</h2>
                <p>{order.shipping_address.recipient_name}</p>
                <p>
                  {order.shipping_address.full_address},{" "}
                  {order.shipping_address.destination_text}
                </p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            {/* Rincian Biaya */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Rincian Biaya</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal Produk</span>
                  <span>{formatRupiah(order.subtotal_products)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ongkos Kirim</span>
                  <span>{formatRupiah(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Biaya Layanan</span>
                  <span>{formatRupiah(order.service_fee)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskon ({order.voucher_code})</span>
                    <span>- {formatRupiah(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatRupiah(order.total_amount)}</span>
                </div>
              </div>
            </div>
            {/* Form Manajemen */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Manajemen Pesanan</h2>
              <form onSubmit={handleUpdateOrder} className="space-y-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium">
                    Ubah Status
                  </label>
                  <select
                    id="status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="paid">Telah Dibayar</option>
                    <option value="processing">Diproses</option>
                    <option value="shipped">Dikirim</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="resi" className="block text-sm font-medium">
                    Nomor Resi
                  </label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      id="resi"
                      value={resiNumber}
                      onChange={(e) => setResiNumber(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                    <button
                      type="button"
                      onClick={handleTrackShipment}
                      disabled={!resiNumber}
                      className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:bg-gray-300"
                    >
                      Lacak
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </form>
            </div>
            {order?.courier_details && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4">Shipping Label</h2>
                <ShippingLabel
                  courierCode={order.courier_details.code || order.courier_details.courier_company || ''}
                  courierName={order.courier_details.name || order.courier_details.courier_company || 'Biteship'}
                  routingCode={order.courier_details.courier_service_code || order.courier_details.service || '-'}
                  waybillId={order.courier_details.waybill_id || order.courier_details.tracking_id || order.shipping_receipt_number || '-'}
                  shippingCost={order.shipping_cost || 0}
                  serviceName={order.courier_details.service || order.courier_details.courier_service_name || '-'}
                  referenceId={order.order_number || '-'}
                  quantity={(order.order_items || []).length}
                  weight={(order.order_items || []).reduce((sum, item) => sum + ((item.products?.berat_gram || 500) * (item.quantity || 1)), 0)}
                  recipientName={order.shipping_address?.recipient_name || '-'}
                  recipientPhone={order.shipping_address?.recipient_phone || '-'}
                  recipientAddress={order.shipping_address?.full_address || '-'}
                  recipientCity={order.shipping_address?.destination_text || '-'}
                  recipientPostal={order.shipping_address?.postal_code || '-'}
                  senderName="BJS RACING Official"
                  senderPhone="-"
                  senderAddress="-"
                  senderCity="Jepara, Jawa Tengah"
                  senderPostal="-"
                  items={(order.order_items || []).map((item) => `${item.quantity}x ${item.products?.nama || 'Item'}`).join(', ') || '-'}
                  notes={order.notes || ''}
                  codAmount={order.payment_method === 'cod' ? order.total_amount : 0}
                  insuranceAmount={0}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal Pelacakan */}
      <TrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        trackingData={trackingData}
        isLoading={isTracking}
        error={trackingError}
      />
    </>
  );
}
