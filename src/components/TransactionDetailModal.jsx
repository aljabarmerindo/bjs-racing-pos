// src/components/TransactionDetailModal.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function TransactionDetailModal({ isOpen, onClose, transaction }) {
  const [displayItems, setDisplayItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    if (!transaction?.items) return;

    const hydrateItems = async () => {
      setLoadingItems(true);
      const firstItem = transaction.items[0];

      // Cek apakah ini transaksi grosir (berdasarkan key 'harga_grosir_deal')
      if (firstItem && "harga_grosir_deal" in firstItem) {
        try {
          const productIds = transaction.items.map((item) => item.product_id);
          const { data: productsData, error } = await supabase
            .from("products")
            .select("id, nama, kode")
            .in("id", productIds);

          if (error) throw error;

          // Buat "kamus" produk untuk pencarian cepat
          const productsMap = new Map(productsData.map((p) => [p.id, p]));

          // Gabungkan data transaksi dengan detail produk
          const hydrated = transaction.items.map((item) => ({
            ...item, // kuantitas, harga_grosir_deal, dll.
            nama:
              productsMap.get(item.product_id)?.nama ||
              "Produk tidak ditemukan",
            kode: productsMap.get(item.product_id)?.kode || "-",
          }));
          setDisplayItems(hydrated);
        } catch (err) {
          console.error(
            "Gagal mengambil detail produk untuk transaksi grosir:",
            err,
          );
          setDisplayItems([]); // Tampilkan kosong jika error
        }
      } else {
        // Jika ini transaksi POS biasa, langsung gunakan datanya
        setDisplayItems(transaction.items);
      }
      setLoadingItems(false);
    };

    hydrateItems();
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const isGrosir =
    transaction.items?.[0] && "harga_grosir_deal" in transaction.items[0];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Detail Transaksi</h2>
        <p className="text-sm text-slate-500 mb-4">
          Tanggal:{" "}
          {new Date(transaction.created_at).toLocaleString("id-ID", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </p>

        <div className="max-h-60 overflow-y-auto border-t border-b py-2">
          <h3 className="font-semibold mb-2">Item yang Terjual:</h3>
          {loadingItems ? (
            <p>Memuat item...</p>
          ) : (
            displayItems.map((item, index) => (
              <div
                key={item.id || index}
                className="flex justify-between items-center mb-1 text-sm"
              >
                <span>
                  {item.nama}{" "}
                  <span className="text-slate-500">
                    x{item.kuantitas || item.quantity}
                  </span>
                </span>
                <span>
                  Rp{" "}
                  {isGrosir
                    ? new Intl.NumberFormat("id-ID").format(
                        item.harga_grosir_deal * item.kuantitas,
                      )
                    : new Intl.NumberFormat("id-ID").format(
                        item.harga_jual * item.quantity,
                      )}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Bagian total tidak berubah */}
        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>
              Rp {new Intl.NumberFormat("id-ID").format(transaction.total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Diskon</span>
            <span className="text-red-500">
              - Rp {new Intl.NumberFormat("id-ID").format(transaction.diskon)}
            </span>
          </div>
          {transaction.shipping_cost > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Ongkos Kirim</span>
              <span className="text-blue-600">
                + Rp {new Intl.NumberFormat("id-ID").format(transaction.shipping_cost)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Total Akhir</span>
            <span>
              Rp{" "}
              {new Intl.NumberFormat("id-ID").format(transaction.total_akhir)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Bayar</span>
            <span>
              Rp {new Intl.NumberFormat("id-ID").format(transaction.bayar)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Kembalian</span>
            <span>
              Rp {new Intl.NumberFormat("id-ID").format(transaction.kembalian)}
            </span>
          </div>
        </div>

        {(transaction.shipping_method || transaction.shipping_address_id) && (
          <div className="mt-4 border-t pt-3 text-sm">
            <h3 className="font-semibold mb-2">Detail Pengiriman</h3>
            {transaction.shipping_method && (
              <p className="text-slate-700">
                <span className="text-slate-500">Kurir:</span> {transaction.shipping_method}
              </p>
            )}
            {transaction.shipping_service && (
              <p className="text-slate-700">
                <span className="text-slate-500">Layanan:</span> {transaction.shipping_service}
              </p>
            )}
            {transaction.shipping_etd && (
              <p className="text-slate-700">
                <span className="text-slate-500">Estimasi:</span> {transaction.shipping_etd}
              </p>
            )}
            {transaction.shipping_destination_text && (
              <p className="text-slate-700">
                <span className="text-slate-500">Alamat:</span> {transaction.shipping_destination_text}
              </p>
            )}
            {transaction.shipping_postal_code && (
              <p className="text-slate-700">
                <span className="text-slate-500">Kode Pos:</span> {transaction.shipping_postal_code}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-2 px-4 rounded"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailModal;
