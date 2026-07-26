// src/pages/TransactionHistory.jsx

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient.js";
import TransactionDetailModal from "../components/TransactionDetailModal.jsx";
import TransactionFilter from "../components/TransactionFilter.jsx";

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // <-- 1. TAMBAHKAN STATE UNTUK MENYIMPAN KONDISI FILTER SAAT INI
  const [filters, setFilters] = useState({
    searchTerm: "",
    status: "semua",
    customer: "semua",
  });

  const fetchSummaryData = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_transaction_summary");
    if (data && data.length > 0) setSummary(data[0]);
    if (error) console.error("Error fetching summary:", error);
  }, []);

  const getTransactions = useCallback(async (currentFilters, page) => {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from("transactions_list_view")
      .select("*", { count: "exact" });

    // --- LOGIKA PENCARIAN BARU ---
    if (currentFilters.searchTerm) {
      // Cari berdasarkan Nomor Nota ATAU Nama Pelanggan
      query = query.or(
        `invoice_number.ilike.%${currentFilters.searchTerm}%,nama_pelanggan.ilike.%${currentFilters.searchTerm}%`,
      );
    }
    // --- AKHIR LOGIKA PENCARIAN BARU ---

    if (currentFilters.status !== "semua") {
      query = query.eq("status_pembayaran", currentFilters.status);
    }
    if (currentFilters.customer !== "semua") {
      query = query.eq("customer_id", currentFilters.customer);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  // <-- 2. BUAT SATU useEffect UTAMA UNTUK MENGAMBIL DATA
  //    useEffect ini akan berjalan saat filter atau halaman berubah.
  useEffect(() => {
    getTransactions(filters, currentPage);
  }, [filters, currentPage, getTransactions]);

  // <-- 3. UBAH FUNGSI HANDLER MENJADI LEBIH SEDERHANA
  //    Tugasnya sekarang hanya meng-update state filter dan mereset halaman ke 1.
  const handleFilterChange = useCallback((newFilters) => {
    setCurrentPage(1);
    setFilters(newFilters);
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (transactions.length > 0 && transactions.every((t) => prev.has(t.id))) {
        return new Set();
      }
      return new Set(transactions.map((t) => t.id));
    });
  }, [transactions]);

  const handleDelete = useCallback(
    async (ids) => {
      if (
        !window.confirm(
          "Yakin hapus " +
            ids.length +
            " transaksi? Stok barang akan dikembalikan.",
        )
      )
        return;

      setIsDeleting(true);
      try {
        const errors = [];
        for (const id of ids) {
          const { error } = await supabase.rpc(
            "delete_transaction_and_restore_stock",
            { p_transaction_id: id },
          );
          if (error) errors.push(error);
        }

        if (errors.length > 0) {
          alert(
            "Gagal menghapus beberapa transaksi: " + errors[0].message,
          );
        } else {
          setSelectedIds(new Set());
          await getTransactions(filters, currentPage);
          await fetchSummaryData();
        }
      } catch (err) {
        alert("Gagal menghapus transaksi: " + err.message);
      } finally {
        setIsDeleting(false);
      }
    },
    [filters, currentPage, getTransactions, fetchSummaryData],
  );

  return (
    <div>
      <TransactionDetailModal
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Riwayat Transaksi</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-slate-500">Total Penjualan (Hari Ini)</p>
          <p className="text-2xl font-bold">
            Rp {new Intl.NumberFormat("id-ID").format(summary?.today || 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-slate-500">Total Piutang (Belum Lunas)</p>
          <p className="text-2xl font-bold text-red-500">
            Rp {new Intl.NumberFormat("id-ID").format(summary?.unpaid || 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-slate-500">Jumlah Transaksi (Bulan Ini)</p>
          <p className="text-2xl font-bold">
            {summary?.thisMonth || 0} Transaksi
          </p>
        </div>
      </div>

      <TransactionFilter onFilterChange={handleFilterChange} />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm font-semibold text-red-700">
            {selectedIds.size} dipilih
          </span>
          <button
            onClick={() => handleDelete(Array.from(selectedIds))}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
          >
            {isDeleting ? "Menghapus..." : "Hapus Terpilih"}
          </button>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead className="bg-slate-200">
            <tr>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-12">
                <input
                  type="checkbox"
                  aria-label="Pilih Semua"
                  checked={
                    transactions.length > 0 &&
                    transactions.every((t) => selectedIds.has(t.id))
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Tanggal & Waktu
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Pelanggan
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Pengiriman
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Total Akhir
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Status
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-10">
                  Memuat data...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-slate-500">
                  Tidak ada transaksi yang cocok.
                </td>
              </tr>
            ) : (
              transactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-slate-50">
                  <td className="px-3 py-4 border-b border-slate-200 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(trx.id)}
                      onChange={() => toggleSelect(trx.id)}
                    />
                  </td>
                  <td className="px-5 py-4 border-b border-slate-200 text-sm">
                    {new Date(trx.created_at).toLocaleString("id-ID", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-200 text-sm">
                    {trx.nama_pelanggan || "Pelanggan Umum"}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-200 text-sm">
                    {trx.shipping_method ? (
                      <div>
                        <p className="font-semibold">{trx.shipping_method}</p>
                        {trx.shipping_service && (
                          <p className="text-xs text-slate-500">{trx.shipping_service}</p>
                        )}
                        {trx.shipping_cost > 0 && (
                          <p className="text-xs text-blue-600">
                            +Rp {new Intl.NumberFormat("id-ID").format(trx.shipping_cost)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-200 text-sm font-semibold">
                    Rp {new Intl.NumberFormat("id-ID").format(trx.total_akhir)}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-200 text-sm">
                    <span
                      className={`px-2 py-1 font-semibold leading-tight rounded-full text-xs ${trx.status_pembayaran === "Lunas" ? "bg-green-100 text-green-900" : "bg-yellow-100 text-yellow-900"}`}
                    >
                      {trx.status_pembayaran}
                    </span>
                  </td>
                  <td className="px-5 py-4 border-b border-slate-200 text-sm text-center">
                    <button
                      onClick={() => setSelectedTransaction(trx)}
                      className="text-blue-500 hover:underline"
                    >
                      Lihat Detail
                    </button>
                    <span className="mx-1 text-slate-300">|</span>
                    <button
                      onClick={() => handleDelete([trx.id])}
                      disabled={isDeleting}
                      className="text-red-500 hover:underline disabled:opacity-50"
                    >
                      {isDeleting ? "Menghapus..." : "Hapus"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && totalPages > 1 && (
          <div className="px-5 py-3 flex justify-between items-center">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="text-sm bg-slate-200 px-3 py-1 rounded disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-sm">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="text-sm bg-slate-200 px-3 py-1 rounded disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionHistory;
