// src/App.jsx
import { useState, useEffect } from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom"; // Tambahkan Navigate
import { supabase } from "./supabaseClient.js";
import Navbar from "./components/Navbar.jsx";
import Header from "./components/Header.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Produk from "./pages/Produk.jsx";
import Pos from "./pages/Pos.jsx";
import PenjualanGrosir from "./pages/PenjualanGrosir.jsx";
import FormPesananGrosir from "./pages/FormPesananGrosir.jsx";
import DetailPesananGrosir from "./pages/DetailPesananGrosir.jsx";
import FormNotaGrosir from "./pages/FormNotaGrosir.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Pembelian from "./pages/Pembelian.jsx";
import FormPembelian from "./pages/FormPembelian.jsx";
import DetailPembelian from "./pages/DetailPembelian.jsx";
import DetailNotaPage from "./pages/DetailNotaPage.jsx";
import Customers from "./pages/Customers.jsx";
import Login from "./pages/Login.jsx";
import TransactionHistory from "./pages/TransactionHistory.jsx";
import StockHistory from "./pages/StockHistory.jsx";
import Expenses from "./pages/Expenses.jsx";
import LaporanLabaRugi from "./pages/LaporanLabaRugi.jsx";
import PermintaanPelanggan from "./pages/PermintaanPelanggan.jsx";
import LaporanProdukTerlaris from "./pages/LaporanProdukTerlaris";
import LaporanProdukPilok from "./pages/LaporanProdukPilok";
import RiwayatProduk from "./pages/RiwayatProduk.jsx";
import CetakDokumenPage from "./pages/CetakDokumenPage.jsx";
import PesananOnlinePage from "./pages/PesananOnline";
import DetailPesananOnlinePage from "./pages/DetailPesananOnline";
import VoucherListPage from "./pages/VoucherListPage";
import VoucherForm from "./pages/VoucherForm";
import ManajemenModelAI from "./pages/ManajemenModelAI.jsx";
import ManajemenMargin from "./pages/ManajemenMargin.jsx";
import ManajemenKategori from "./pages/ManajemenKategori.jsx";
import ManajemenMerek from "./pages/ManajemenMerek.jsx";
import PromoBanners from "./pages/PromoBanners.jsx";
import Brands from "./pages/Brands.jsx";
import FlashSales from "./pages/FlashSales.jsx";
import GojekAreas from "./pages/GojekAreas.jsx";
import BjsExpressModule from "./pages/BjsExpressModule.jsx";
import ManajemenFeed from "./pages/ManajemenFeed.jsx";
import VideoListPage from "./pages/VideoListPage.jsx";
import ManajemenKendaraan from "./pages/ManajemenKendaraan.jsx";



function MainLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="h-screen bg-orange-100 flex">
      <Navbar
        isOpen={isSidebarOpen}
        onLinkClick={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// 📌 Perbaikan dimulai dari sini
function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fungsi untuk mendapatkan sesi dan memvalidasi peran pengguna
    const checkSessionAndRole = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      // Jika ada sesi, periksa peran di tabel profiles
      if (currentSession) {
        // Coba perbarui sesi secara paksa
        const { data, error } = await supabase.auth.refreshSession();

        if (error || !data.session) {
          await supabase.auth.signOut(); // Logout jika sesi tidak valid
          setSession(null);
        } else {
          setSession(data.session);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
    };

    checkSessionAndRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // Tidak perlu memanggil checkSessionAndRole lagi di sini
      // Cukup set newSession, karena validasi utama sudah di atas
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-800 text-white">
        Memuat Sesi...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* RUTE YANG MEMERLUKAN AUTENTIKASI */}
      {session ? (
        <>
          <Route path="/cetak/:tipe/:id" element={<CetakDokumenPage />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<Pos />} />
            <Route path="/pesanan-online" element={<PesananOnlinePage />} />
            <Route
              path="/pesanan-online/:orderId"
              element={<DetailPesananOnlinePage />}
            />
            <Route path="/manajemen-voucher" element={<VoucherListPage />} />
            <Route path="/manajemen-voucher/form" element={<VoucherForm />} />
            <Route
              path="/manajemen-voucher/form/:voucherId"
              element={<VoucherForm />}
            />
            <Route path="/manajemen-promo" element={<PromoBanners />} />
            <Route path="/manajemen-brand" element={<Brands />} />
            <Route path="/manajemen-flash-sale" element={<FlashSales />} />
            <Route path="/manajemen-gojek-areas" element={<GojekAreas />} />
            <Route path="/manajemen-bjs-express-area" element={<Navigate to="/bjs-express" replace />} />
            <Route path="/bjs-express" element={<BjsExpressModule />} />
            <Route path="penjualan-grosir">
              <Route index element={<PenjualanGrosir />} />
              <Route path="baru" element={<FormPesananGrosir />} />
              <Route path="edit/:soId" element={<FormPesananGrosir />} />
              <Route path="detail/:soId" element={<DetailPesananGrosir />} />
              <Route path="nota/baru/:orderId" element={<FormNotaGrosir />} />
            </Route>
            <Route path="nota/detail/:invoiceId" element={<DetailNotaPage />} />
            <Route path="produk">
              <Route index element={<Produk />} />
              <Route path="riwayat/:productId" element={<RiwayatProduk />} />
            </Route>
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="pembelian" element={<Pembelian />} />
            <Route path="pembelian/baru" element={<FormPembelian />} />
            <Route path="pembelian/edit/:poId" element={<FormPembelian />} />
            <Route
              path="pembelian/detail/:poId"
              element={<DetailPembelian />}
            />
            <Route path="pelanggan" element={<Customers />} />
            <Route
              path="permintaan-pelanggan"
              element={<PermintaanPelanggan />}
            />
            <Route path="pengeluaran" element={<Expenses />} />
            <Route path="/laporan/laba-rugi" element={<LaporanLabaRugi />} />
            <Route
              path="laporan-produk-terlaris"
              element={<LaporanProdukTerlaris />}
            />
            <Route
              path="laporan-produk-pilok"
              element={<LaporanProdukPilok />}
            />
            <Route path="histori-transaksi" element={<TransactionHistory />} />
            <Route path="histori-stok" element={<StockHistory />} />
            <Route path="manajemen-ai" element={<ManajemenModelAI />} />
            <Route path="manajemen-margin" element={<ManajemenMargin />} />
            <Route path="manajemen-kategori" element={<ManajemenKategori />} />
            <Route path="manajemen-merek" element={<ManajemenMerek />} />
            <Route path="manajemen-video" element={<VideoListPage />} />
            <Route path="manajemen-feed" element={<ManajemenFeed />} />
            <Route path="manajemen-kendaraan" element={<ManajemenKendaraan />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </>
      ) : (
        // Redirect ke login jika tidak ada sesi
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default App;
