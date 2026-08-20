// File: api/couriers.js
// Vercel Serverless Function — CRUD data kurir internal BJS Express.
// Menangani /api/couriers (GET, POST), /api/couriers/:id (PUT, DELETE), dan /api/upload-drive (POST).
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { Readable } from "stream";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

function getDriveClient() {
  const serviceAccountJson = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  const serviceAccountJsonPath = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH;

  if (!serviceAccountJson && !serviceAccountJsonPath) {
    throw new Error("Google Drive service account credentials tidak diatur.");
  }

  const auth = new google.auth.GoogleAuth({
    scopes: DRIVE_SCOPES,
    credentials: serviceAccountJson ? JSON.parse(serviceAccountJson) : undefined,
    keyFile: serviceAccountJsonPath || undefined,
  });

  return google.drive({ version: "v3", auth });
}

async function handleUploadDrive(req, res) {
  try {
    let payload;
    try {
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ message: "Body harus berupa JSON." });
    }

    const { filename, mimeType, base64 } = payload || {};
    if (!base64 || !filename) {
      return res.status(400).json({ message: "Data file tidak lengkap." });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
    const drive = getDriveClient();
    const fileName = `${Date.now()}_${filename}`;
    const buffer = Buffer.from(base64, "base64");

    const result = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
        mimeType: mimeType || "application/octet-stream",
      },
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: Readable.from(buffer),
      },
      fields: "id, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    const fileId = result.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
      supportsAllDrives: true,
    });

    res.status(200).json({
      success: true,
      id: fileId,
      url: `https://drive.google.com/uc?export=view&id=${fileId}`,
    });
  } catch (err) {
    console.error("Upload ke Google Drive gagal:", err);
    res.status(500).json({ message: err.message || "Gagal upload ke Google Drive." });
  }
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.url && req.url.includes("/api/upload-drive")) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ message: "Method Not Allowed" });
    }
    return handleUploadDrive(req, res);
  }

  const id = extractId(req.url);

  if (id) {
    if (req.method === "PUT") {
      return handlePut(req, res, id);
    }
    if (req.method === "DELETE") {
      return handleDelete(req, res, id);
    }
    res.setHeader("Allow", "PUT, DELETE");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}

function extractId(url) {
  const match = String(url || "").match(/\/api\/couriers\/([^/?]+)/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  return id && !Array.isArray(id) ? id : null;
}

async function handleGet(req, res) {
  try {
    const { data, error } = await supabase
      .from("couriers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Couriers list Supabase error:", error);
      return res.status(500).json({ message: "Gagal memuat data kurir.", details: error.message });
    }
    res.status(200).json(data || []);
  } catch (err) {
    console.error("Couriers list error:", err);
    res.status(500).json({ message: "Gagal memuat data kurir.", details: err.message });
  }
}

async function handlePost(req, res) {
  try {
    const { email, password, name, phone, plate_number, vehicle_type, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Nama kurir wajib diisi." });
    }

    let userId = null;

    // Jika email diberikan, buat akun login kurir (Supabase Auth) + row profiles role courier.
    if (email) {
      if (!password) {
        return res.status(400).json({ message: "Password wajib diisi saat membuat akun login." });
      }

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError) {
        console.error("Courier create auth error:", authError);
        return res.status(500).json({ message: "Gagal membuat akun login kurir.", details: authError.message });
      }
      userId = authUser.user.id;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: userId, role: "courier" }, { onConflict: "id" });
      if (profileError) {
        console.error("Courier profile upsert error:", profileError);
        return res.status(500).json({ message: "Gagal menyimpan role kurir.", details: profileError.message });
      }
    }

    const { data, error } = await supabase
      .from("couriers")
      .insert({
        user_id: userId,
        name,
        phone: phone || null,
        plate_number: plate_number || null,
        vehicle_type: vehicle_type || "motor",
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Courier create Supabase error:", error);
      return res.status(500).json({ message: "Gagal menambah kurir.", details: error.message });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("Courier create error:", err);
    res.status(500).json({ message: "Gagal menambah kurir.", details: err.message });
  }
}

async function handlePut(req, res, id) {
  try {
    const { name, phone, plate_number, vehicle_type, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Nama kurir wajib diisi." });
    }

    const { data, error } = await supabase
      .from("couriers")
      .update({
        name,
        phone: phone || null,
        plate_number: plate_number || null,
        vehicle_type: vehicle_type || "motor",
        is_active: is_active ?? true,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Courier update error:", error);
      return res.status(500).json({ message: "Gagal memperbarui kurir.", details: error.message });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("Courier update error:", err);
    res.status(500).json({ message: "Gagal memperbarui kurir.", details: err.message });
  }
}

async function handleDelete(req, res, id) {
  try {
    const { error } = await supabase.from("couriers").delete().eq("id", id);
    if (error) {
      console.error("Courier delete error:", error);
      return res.status(500).json({ message: "Gagal menghapus kurir.", details: error.message });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Courier delete error:", err);
    res.status(500).json({ message: "Gagal menghapus kurir.", details: err.message });
  }
}
