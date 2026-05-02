import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── Schemas ───────────────────────────────────────────────────────
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  const { email, password } = parse.data;

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    res.status(401).json({ error: error?.message || "Invalid credentials" });
    return;
  }

  // Fetch profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: profile?.full_name || data.user.user_metadata?.full_name || email.split("@")[0],
      username: profile?.username,
      avatar_url: profile?.avatar_url,
      status: profile?.status || "online",
      status_message: profile?.status_message || "",
    },
    access: data.session.access_token,
    refresh: data.session.refresh_token,
    expires_at: data.session.expires_at,
  });
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  const { name, email, password } = parse.data;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: name },
    email_confirm: true, // auto-confirm so no email verification needed in dev
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  // Sign in immediately to get a session
  const { data: session } = await supabaseAdmin.auth.signInWithPassword({ email, password });

  res.status(201).json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name,
      status: "online",
    },
    access: session?.session?.access_token || null,
    refresh: session?.session?.refresh_token || null,
  });
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) { res.status(400).json({ error: "Refresh token required" }); return; }

  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: token });
  if (error || !data.session) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }
  res.json({
    access: data.session.access_token,
    refresh: data.session.refresh_token,
    expires_at: data.session.expires_at,
  });
});

// POST /api/auth/logout
router.post("/logout", async (req: Request, res: Response) => {
  // Supabase stateless — just confirm on client side
  res.json({ success: true });
});

export default router;
