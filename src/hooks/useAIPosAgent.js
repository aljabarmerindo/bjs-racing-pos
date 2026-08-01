import { useState, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient.js";
import { callGeminiWithFallback } from "../lib/geminiProxy.js";

export function useAIPosAgent({
  onAddProductToCart,
  onUpdateCartQuantity,
  onRemoveFromCart,
  onClearCart,
  aiProvider = "gemini",
  ollamaUrl = "http://localhost:11434",
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const [error, setError] = useState(null);
  const [aiActions, setAiActions] = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);

  const callbacksRef = useRef({
    onAddProductToCart,
    onUpdateCartQuantity,
    onRemoveFromCart,
    onClearCart,
  });
  callbacksRef.current = {
    onAddProductToCart,
    onUpdateCartQuantity,
    onRemoveFromCart,
    onClearCart,
  };

  const findBestMatchingProduct = async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) return [];
    try {
      const keywords = searchQuery
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 1);

      const { data, error } = await supabase
        .from("products")
        .select("id, nama, merek, kode, kategori, harga_jual, harga_beli, stok, stok_min, satuan_dasar, satuan_pembelian, nilai_konversi, status, ukuran")
        .eq("status", "Aktif")
        .limit(500);

      if (error) throw error;

      const scored = (data || []).map((p) => {
        const namaLower = (p.nama || "").toLowerCase();
        const merekLower = (p.merek || "").toLowerCase();
        const kodeLower = (p.kode || "").toLowerCase();
        const ukuranLower = (p.ukuran || "").toLowerCase();
        const combined = `${namaLower} ${merekLower} ${kodeLower} ${ukuranLower}`;
        let score = 0;
        for (const kw of keywords) {
          if (combined.includes(kw)) score++;
        }
        return { ...p, _score: score };
      });

      let results = scored.filter((p) => p._score === keywords.length);
      if (results.length === 0 && keywords.length >= 2) {
        results = scored.filter((p) => p._score >= 2);
      }
      if (results.length === 0) {
        results = scored.filter((p) => p._score > 0);
      }

      return results.sort((a, b) => b._score - a._score);
    } catch (err) {
      console.error("Gagal melakukan pencarian produk di database:", err);
      return [];
    }
  };

  const processCommand = useCallback(async (inputText) => {
    if (!inputText || !inputText.trim()) return;
    if (processingRef.current) return;
    processingRef.current = true;

    const sanitizedInput = inputText.trim().slice(0, 200);

    setIsProcessing(true);
    setError(null);
    setAiActions([]);

    const systemPrompt = `Anda adalah AI POS Agent untuk toko bengkel motor "BJS Racing".
Tugas Anda adalah menganalisis ucapan atau ketikan dari kasir dan menerjemahkannya ke dalam daftar aksi terstruktur dalam format JSON.

Anda dapat mengenali aksi-aksi berikut:
1. ADD_TO_CART: Kasir ingin menambah/membeli barang. Contoh: "tambah oli shell helix 2 botol" atau "beli kampas rem bendix 1".
2. UPDATE_QUANTITY: Kasir ingin mengubah kuantitas barang yang ada di keranjang. Contoh: "ubah jumlah mpx2 jadi 5" atau "tambah mpx2 3 biji lagi".
3. REMOVE_FROM_CART: Kasir ingin membatalkan/menghapus barang dari keranjang. Contoh: "hapus oli mpx2" atau "batalkan kampas rem".
4. CLEAR_CART: Kasir ingin mengosongkan keranjang. Contoh: "kosongkan keranjang", "reset transaksi", atau "batal semua".

ATURAN PENCARIAN PRODUK (SANGAT PENTING):
- search_query HANYA berisi kata kunci produk yang relevan. JANGAN tambah kata generik seperti "pilok", "cat", "spray" kecuali memang bagian dari nama produk.
- Produk Diton Pilok: nama = warna (contoh: "White", "Black Doff", "Pearl White", "Red"), merek = "Diton". Setiap warna tersedia dalam 3 ukuran: 150ml, 300ml, 400ml.
- Jika user menyebut ukuran pilok (150ml, 300ml, 400ml, kecil, sedang, besar), SERTAKAN di search_query. Contoh: "Diton Black 300ml"
- Jika user TIDAK menyebut ukuran, JANGAN sertakan ukuran di search_query. Sistem akan menampilkan semua ukuran yang tersedia.
- Produk Oli: nama produk biasanya sudah lengkap (contoh: "Shell Helix Ultra ECT C2 5W-30", "Federal Mpx2").
- Produk Kampas/Part: gunakan kata kunci merek dan tipe (contoh: "kampas rem Bendix", " rantai TK").

Contoh benar:
- user "Diton white 5 pcs" → search_query: "Diton White", quantity: 5
- user "Diton black 300ml 2" → search_query: "Diton Black 300ml", quantity: 2
- user "Diton black doff 400ml 1" → search_query: "Diton Black Doff 400ml", quantity: 1
- user "pilok diton hitam doff 1" → search_query: "Diton Black Doff", quantity: 1
- user "oli shell 2" → search_query: "Shell Helix", quantity: 2
- user "kampas rem bendix 3" → search_query: "kampas rem Bendix", quantity: 3

Contoh SALAH:
- user "Diton white 5" → search_query: "pilok diton white" (JANGAN tambah "pilok")
- user "Diton black 300ml 2" → search_query: "Diton Black" (HILANGKAN ukuran, harusnya sertakan "300ml")

ATURAN OUTPUT:
- Harus mengembalikan data dalam format JSON array murni tanpa komentar, penjelasan, atau markdown wrapper.
- Skema JSON wajib berupa array objek dengan format:
  [
    {
      "action": "ADD_TO_CART" | "UPDATE_QUANTITY" | "REMOVE_FROM_CART" | "CLEAR_CART",
      "search_query": "nama produk atau merek yang dicari secara spesifik dalam bahasa Indonesia",
      "quantity": angka_integer (jumlah barang, default 1 jika tidak disebutkan),
      "notes": "catatan opsional (seperti warna pilok, merek khusus, tipe motor)"
    }
  ]

Contoh input: "masukin oli federal mpx2 dua botol sama pilok diton hitam doff satu 300ml"
Contoh output:
[
  {"action": "ADD_TO_CART", "search_query": "Federal Mpx2", "quantity": 2, "notes": ""},
  {"action": "ADD_TO_CART", "search_query": "Diton Black Doff 300ml", "quantity": 1, "notes": "hitam doff"}
]`;

    try {
      let parsedActions = [];

      if (aiProvider === "gemini") {
        const resData = await callGeminiWithFallback({
          contents: [
            {
              role: "user",
              parts: [
                { text: systemPrompt },
                { text: `Input Kasir: "${sanitizedInput}"` },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const candidate = resData.candidates?.[0];
        setActiveProvider({ provider: resData._provider || "gemini", model: resData._model || "gemini-3-flash-preview" });
        if (!candidate?.content?.parts?.[0]?.text) {
          throw new Error(
            "AI tidak dapat memproses perintah ini. Kemungkinan konten diblokir oleh filter keamanan.",
          );
        }
        let aiText = candidate.content.parts[0].text.trim();
        const jsonMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          aiText = jsonMatch[1].trim();
        }
        parsedActions = JSON.parse(aiText);
      } else if (aiProvider === "ollama") {
        const response = await fetch(`${ollamaUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "qwen2.5:3b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Input Kasir: "${sanitizedInput}"` },
            ],
            stream: false,
            options: { temperature: 0.1 },
          }),
        });

        if (!response.ok) {
          throw new Error(
            "Gagal menghubungi server Ollama lokal. Pastikan Ollama sudah dijalankan.",
          );
        }

        const resData = await response.json();
        if (!resData.message?.content) {
          throw new Error(
            "Respons Ollama tidak valid. Pastikan model qwen2.5:3b sudah diunduh.",
          );
        }
        let cleanText = resData.message.content.trim();
        const ocrMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (ocrMatch) {
          cleanText = ocrMatch[1].trim();
        }
        parsedActions = JSON.parse(cleanText);
      }

      if (!Array.isArray(parsedActions)) {
        throw new Error("Format respon AI tidak valid (bukan array).");
      }

      const validActions = [
        "ADD_TO_CART",
        "UPDATE_QUANTITY",
        "REMOVE_FROM_CART",
        "CLEAR_CART",
      ];
      const filteredActions = parsedActions.filter((item) => {
        if (!item || !validActions.includes(item.action)) return false;
        if (item.action !== "CLEAR_CART" && !item.search_query) return false;
        return true;
      });

      setAiActions(filteredActions);

      const actionsToSearch = filteredActions.filter(
        (item) => item.action !== "CLEAR_CART",
      );
      const searchResults = await Promise.all(
        actionsToSearch.map((item) =>
          findBestMatchingProduct(item.search_query),
        ),
      );

      const executionSummary = [];
      let searchIdx = 0;

      for (const item of filteredActions) {
        const { action, notes } = item;
        const quantity =
          item.quantity != null ? Math.max(1, Number(item.quantity) || 1) : 1;

        if (action === "CLEAR_CART") {
          if (callbacksRef.current.onClearCart) {
            callbacksRef.current.onClearCart();
            executionSummary.push({
              status: "success",
              message: "Keranjang berhasil dikosongkan.",
            });
          }
          continue;
        }

        const matchedProducts = searchResults[searchIdx] || [];
        searchIdx++;

        if (matchedProducts.length === 0) {
          executionSummary.push({
            status: "not_found",
            message: `Produk dengan pencarian "${item.search_query}" tidak ditemukan di database.`,
          });
          continue;
        }

        if (matchedProducts.length === 1) {
          const product = matchedProducts[0];
          const sizeInfo = product.ukuran ? ` (${product.ukuran})` : "";

          if (action === "ADD_TO_CART" && callbacksRef.current.onAddProductToCart) {
            callbacksRef.current.onAddProductToCart(product, quantity);
            executionSummary.push({
              status: "success",
              message: `Berhasil menambahkan ${quantity} x ${product.nama}${sizeInfo} ke keranjang.`,
            });
          } else if (action === "UPDATE_QUANTITY" && callbacksRef.current.onUpdateCartQuantity) {
            callbacksRef.current.onUpdateCartQuantity(product.id, quantity);
            executionSummary.push({
              status: "success",
              message: `Berhasil mengubah kuantitas ${product.nama}${sizeInfo} menjadi ${quantity}.`,
            });
          } else if (action === "REMOVE_FROM_CART" && callbacksRef.current.onRemoveFromCart) {
            callbacksRef.current.onRemoveFromCart(product.id);
            executionSummary.push({
              status: "success",
              message: `Berhasil menghapus ${product.nama}${sizeInfo} dari keranjang.`,
            });
          }
        } else {
          executionSummary.push({
            status: "ambiguous",
            query: item.search_query,
            quantity,
            options: matchedProducts,
            message: `Ditemukan beberapa produk yang cocok untuk "${item.search_query}". Silakan pilih salah satu.`,
          });
        }
      }

      return executionSummary;
    } catch (err) {
      console.error("AI POS Agent error:", err);
      setError(err.message || "Terjadi kesalahan saat memproses perintah AI.");
      return null;
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [aiProvider, ollamaUrl]);

  return {
    processCommand,
    isProcessing,
    error,
    aiActions,
    activeProvider,
  };
}
