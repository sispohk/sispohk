import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // biar aman kalau suatu saat beda origin / preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  // kalau dibuka dari browser (GET), jangan 405 kosong—kasih pesan JSON
  if (req.method === "GET") {
    return res.status(200).json({ ok: false, message: "Use POST with { email, password }" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: "Email dan password wajib" });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_JWT_SECRET) {
      return res.status(500).json({ ok: false, error: "ENV belum lengkap" });
    }

    // ambil user (tanpa expose password_hash ke client)
    const url = `${SUPABASE_URL}/rest/v1/app_user?select=id,email,full_name,is_active&email=eq.${encodeURIComponent(email)}&limit=1`;
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const rows = await r.json();
    const user = rows?.[0];
    if (!user || !user.is_active) return res.status(401).json({ ok: false, error: "Login gagal" });

    // verifikasi password via RPC
    const v = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_email: email, p_password: password }),
    });

    const ok = await v.json();
    if (ok !== true) return res.status(401).json({ ok: false, error: "Login gagal" });

    const token = jwt.sign(
      { sub: user.id, role: "authenticated", email: user.email, name: user.full_name },
      SUPABASE_JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({ ok: true, token, user });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
