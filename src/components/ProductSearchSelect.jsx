import React, { useState, useEffect, useRef, useMemo } from "react";
import { FiSearch, FiX, FiChevronDown } from "react-icons/fi";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function ProductSearchSelect({ products = [], onSelect, placeholder = "Cari produk..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debouncedSearch = useDebounce(searchText, 300);

  const filteredProducts = useMemo(() => {
    if (!debouncedSearch) return products;
    const term = debouncedSearch.toLowerCase();
    return products.filter((p) => {
      const name = (p.nama || "").toLowerCase();
      const code = (p.kode || "").toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [products, debouncedSearch]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchText("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (product) => {
    onSelect(product);
    setIsOpen(false);
    setSearchText("");
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredProducts.length ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredProducts.length,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          handleSelect(filteredProducts[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchText("");
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Cari Produk
      </label>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchText("");
        }}
        className={`w-full p-2 border rounded-lg bg-white text-left flex items-center justify-between ${
          isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-300"
        }`}
      >
        <span className="text-slate-500">Ketik nama atau kode produk...</span>
        <FiChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <FiSearch
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                ref={inputRef}
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full pl-7 pr-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>
          <ul ref={listRef} className="max-h-60 overflow-y-auto">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, i) => (
                <li
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={`px-3 py-2 cursor-pointer ${
                    highlightedIndex === i
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{product.nama}</p>
                      <p className="text-xs text-slate-500">
                        {product.kode} {product.merek ? `• ${product.merek}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">
                      Rp {Number(product.harga_jual || 0).toLocaleString("id-ID")}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-slate-400 text-center">
                Tidak ditemukan
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ProductSearchSelect;
