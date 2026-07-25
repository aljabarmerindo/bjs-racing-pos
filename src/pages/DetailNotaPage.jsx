// src/pages/DetailNotaPage.jsx

import React, { useState, useEffect, useCallback, useRef } from "react"; // <-- Tambah useRef
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  FiArrowLeft,
  FiPrinter,
  FiUpload,
  FiCheckSquare,
  FiLoader,
} from "react-icons/fi";
import imageCompression from "browser-image-compression"; // <-- Impor library kompresi

const DetailNotaPage = () => {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // <-- State untuk proses upload/update
  const fileInputRef = useRef(null); // <-- Ref untuk input file tersembunyi

  const fetchInvoiceDetails = useCallback(async () => {
    // Fungsi ini tidak berubah, tetap sama
    setLoading(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*, customers(*)")
        .eq("id", invoiceId)
        .single();
      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*, products(*)")
        .eq("invoice_id", invoiceId);
      if (itemsError) throw itemsError;
      setItems(itemsData);
    } catch (error) {
      console.error("Gagal memuat detail nota:", error);
      alert("Gagal memuat detail nota.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [fetchInvoiceDetails]);

  // --- BLOK BARU: FUNGSI UNTUK UPLOAD & KONFIRMASI ---

  const handleUploadClick = () => {
    // Memicu klik pada input file yang tersembunyi
    fileInputRef.current.click();
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);

    // Opsi kompresi gambar
    const options = {
      maxSizeMB: 1, // Ukuran maksimal 1MB
      maxWidthOrHeight: 1920, // Resolusi maksimal
      useWebWorker: true,
    };

    try {
      console.log(
        `Ukuran file asli: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
      );
      const compressedFile = await imageCompression(file, options);
      console.log(
        `Ukuran file terkompres: ${(compressedFile.size / 1024).toFixed(2)} KB`,
      );

      const filePath = `bukti-bayar/${invoice.id}-${Date.now()}`;

      // Upload ke Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("bukti-bayar") // Ganti 'images' dengan nama bucket Anda jika berbeda
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // Dapatkan URL publik dari file yang diupload
      const {
        data: { publicUrl },
      } = supabase.storage.from("bukti-bayar").getPublicUrl(filePath);

      // Simpan URL ke tabel invoices
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ bukti_pembayaran_url: publicUrl })
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      alert("Upload bukti pembayaran berhasil!");
      fetchInvoiceDetails(); // Muat ulang data untuk menampilkan gambar
    } catch (error) {
      console.error("Error saat upload:", error);
      alert(`Gagal mengupload bukti pembayaran: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (
      window.confirm(
        "Anda yakin ingin menandai nota ini sebagai LUNAS? Status pesanan awal juga akan diubah menjadi Selesai.",
      )
    ) {
      setIsProcessing(true);
      try {
        // Langkah 1: Update status INVOICE menjadi Lunas
        const { error: invoiceError } = await supabase
          .from("invoices")
          .update({ status_pembayaran: "Lunas", tanggal_jatuh_tempo: null })
          .eq("id", invoiceId);
        if (invoiceError) throw invoiceError;

        // Langkah 2: Update status SALES ORDER menjadi Selesai
        if (invoice.sales_order_id) {
          const { error: orderError } = await supabase
            .from("sales_orders")
            .update({ status: "Selesai" })
            .eq("id", invoice.sales_order_id);
          if (orderError) throw orderError;
        }

        alert(
          "Status nota berhasil diubah menjadi Lunas dan pesanan telah diselesaikan.",
        );
        fetchInvoiceDetails(); // Muat ulang data
      } catch (error) {
        alert(`Gagal memproses: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // --- AKHIR BLOK BARU ---

  const getStatusBadge = (status) => {
    switch (status) {
      case "Belum Lunas":
        return "bg-red-100 text-red-800";
      case "Lunas":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  if (loading) return <p className="p-8 text-center">Memuat detail nota...</p>;
  if (!invoice) return <p className="p-8 text-center">Nota tidak ditemukan.</p>;

  return (
    <div className="p-4">
      {/* Input file tersembunyi */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        accept="image/png, image/jpeg"
      />

      <div className="mb-6">
        <Link
          to="/penjualan-grosir"
          className="text-blue-600 hover:underline flex items-center gap-2 mb-2 w-fit"
        >
          <FiArrowLeft />
          <span>Kembali ke Daftar</span>
        </Link>
        <h1 className="text-3xl font-bold">{invoice.invoice_number}</h1>
        <p className="text-slate-500">
          Detail untuk nota pelanggan:{" "}
          <strong>{invoice.customers.nama_pelanggan}</strong>
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        {/* ... (bagian rincian nota & item tidak berubah) ... */}
        <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">
          Rincian Nota
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
          <div>
            <p className="text-slate-500">Tanggal Nota</p>
            <p className="font-semibold">
              {format(new Date(invoice.tanggal_nota), "d MMMM yyyy", {
                locale: id,
              })}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Status Pembayaran</p>
            <span
              className={`px-2 py-1 font-semibold leading-tight rounded-full text-xs ${getStatusBadge(invoice.status_pembayaran)}`}
            >
              {invoice.status_pembayaran}
            </span>
          </div>
          <div>
            <p className="text-slate-500">Termin</p>
            <p className="font-semibold">{invoice.termin_pembayaran}</p>
          </div>
          <div>
            <p className="text-slate-500">Total Tagihan</p>
            <p className="font-bold text-lg text-orange-500">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(invoice.total_akhir)}
            </p>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-slate-800 mb-4 mt-6 border-b pb-2">
          Item pada Nota
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">
                  Produk
                </th>
                <th className="p-3 text-center font-semibold text-slate-600">
                  Jumlah
                </th>
                <th className="p-3 text-right font-semibold text-slate-600">
                  Harga Deal
                </th>
                <th className="p-3 text-right font-semibold text-slate-600">
                  Diskon/Item
                </th>
                <th className="p-3 text-right font-semibold text-slate-600">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="p-3">
                    <p className="font-bold text-slate-800">
                      {item.products.nama}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.products.kode}
                    </p>
                  </td>
                  <td className="p-3 text-center">{item.kuantitas}</td>
                  <td className="p-3 text-right">
                    {new Intl.NumberFormat("id-ID").format(
                      item.harga_grosir_deal,
                    )}
                  </td>
                  <td className="p-3 text-right text-red-500">
                    -{" "}
                    {new Intl.NumberFormat("id-ID").format(item.diskon_item_rp)}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {new Intl.NumberFormat("id-ID").format(
                      item.kuantitas *
                        (item.harga_grosir_deal - item.diskon_item_rp),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- BLOK BARU: TAMPILKAN BUKTI BAYAR JIKA ADA --- */}
        {invoice.bukti_pembayaran_url && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Bukti Pembayaran
            </h3>
            <a
              href={invoice.bukti_pembayaran_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={invoice.bukti_pembayaran_url}
                alt="Bukti Pembayaran"
                className="max-w-xs rounded-lg shadow-md border"
              />
            </a>
          </div>
        )}

        <div className="mt-8 pt-6 border-t flex flex-wrap justify-end gap-4">
          <Link
            to={`/cetak/nota/${invoice.id}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700"
          >
            <FiPrinter />
            <span>Cetak Nota</span>
          </Link>

          {invoice.status_pembayaran === "Belum Lunas" && (
            <>
              <button
                onClick={handleUploadClick}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400"
              >
                {isProcessing ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <FiUpload />
                )}
                <span>
                  {isProcessing ? "Mengupload..." : "Upload Bukti Bayar"}
                </span>
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={!invoice.bukti_pembayaran_url || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                <FiCheckSquare />
                <span>Tandai Lunas</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailNotaPage;
