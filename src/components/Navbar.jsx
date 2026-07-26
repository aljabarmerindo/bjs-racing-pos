// src/components/Navbar.jsx (Versi Final)

import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom"; // Ganti Link dengan NavLink
import { RxDashboard, RxCube, RxArrowRight } from "react-icons/rx";
import {
  FiTruck,
  FiLogOut,
  FiArchive,
  FiClipboard,
  FiTrendingDown,
  FiFileText,
  FiUsers,
  FiShoppingCart,
  FiStar,
  FiBriefcase,
  FiShoppingBag,
  FiTag,
  FiCpu,
  FiPercent,
  FiImage,
  FiAward,
  FiZap,
  FiMapPin,
} from "react-icons/fi";
import { supabase } from "../supabaseClient.js";

function Navbar({ isOpen, onLinkClick }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const navLinks = [
    { name: "Dashboard", path: "/", icon: <RxDashboard /> },
    { name: "POS", path: "/pos", icon: <RxArrowRight /> },

    {
      name: "Pesanan Online",
      path: "/pesanan-online",
      icon: <FiShoppingBag />,
    },
    { name: "Manajemen Voucher", path: "/manajemen-voucher", icon: <FiTag /> },
    { name: "Manajemen Promo", path: "/manajemen-promo", icon: <FiImage /> },
    { name: "Manajemen Brand", path: "/manajemen-brand", icon: <FiAward /> },
    {
      name: "Manajemen Flash Sale",
      path: "/manajemen-flash-sale",
      icon: <FiZap />,
    },
    {
      name: "Area GOJEK",
      path: "/manajemen-gojek-areas",
      icon: <FiMapPin />,
    },
    {
      name: "Penjualan Grosir",
      path: "/penjualan-grosir",
      icon: <FiBriefcase />,
    },
    { name: "Manajemen Produk", path: "/produk", icon: <RxCube /> },
    { name: "Manajemen Supplier", path: "/suppliers", icon: <FiTruck /> },
    {
      name: "Manajemen Pembelian",
      path: "/pembelian",
      icon: <FiShoppingCart />,
    },
    { name: "Manajemen Pelanggan", path: "/pelanggan", icon: <FiUsers /> },
    {
      name: "Permintaan Pelanggan",
      path: "/permintaan-pelanggan",
      icon: <FiStar />,
    },
    {
      name: "Manajemen Pengeluaran",
      path: "/pengeluaran",
      icon: <FiTrendingDown />,
    },
    {
      name: "Laporan Laba/Rugi",
      path: "/laporan/laba-rugi",
      icon: <FiFileText />,
    },
    {
      name: "Riwayat Transaksi",
      path: "/histori-transaksi",
      icon: <FiArchive />,
    },
    { name: "Riwayat Stok", path: "/histori-stok", icon: <FiClipboard /> },
    { name: "Manajemen AI", path: "/manajemen-ai", icon: <FiCpu /> },
    { name: "Pengaturan Margin", path: "/manajemen-margin", icon: <FiPercent /> },
  ];

  const handleLogout = async () => {
    // 📌 Hapus `Maps("/login")` di sini
    await supabase.auth.signOut();
  };

  return (
    // Div utama dibuat fleksibel dan bisa disembunyikan
    <div
      className={`fixed inset-y-0 left-0 transform ${isOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 h-full bg-slate-800 text-white p-4 flex flex-col z-30`}
    >
      {/* Bagian Atas (Judul) - Tidak bisa di-scroll */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-orange-500 mb-8">
          BJS RACING POS
        </h1>
      </div>

      {/* Bagian Tengah (Menu) - BISA DI-SCROLL */}
      <nav className="flex-grow overflow-y-auto pr-2">
        <ul>
          {navLinks.map((link) => (
            <li key={link.name} className="mb-2">
              {/* Menggunakan NavLink untuk styling link aktif */}
              <NavLink
                to={link.path}
                onClick={onLinkClick}
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-orange-500 text-white font-semibold"
                      : "text-white hover:bg-slate-700 hover:text-white"
                  }`
                }
              >
                <span className="mr-3 text-xl">{link.icon}</span>
                {link.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bagian Bawah (Profil & Logout) - Tidak bisa di-scroll */}
      <div className="flex-shrink-0">
        <div className="p-2 border-t border-slate-700">
          <p className="text-xs text-slate-400">Anda login sebagai:</p>
          <p className="font-semibold text-sm truncate">
            {user ? user.email : "Memuat..."}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center p-2 rounded-lg hover:bg-red-500 transition-colors mt-2"
        >
          <span className="mr-3 text-xl">
            <FiLogOut />
          </span>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;
