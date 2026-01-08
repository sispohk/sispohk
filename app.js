import { supa } from "./db.js";

export function getMe() {
  try { return JSON.parse(localStorage.getItem("APP_USER") || "null"); }
  catch { return null; }
}

export function requireLogin() {
  const token = localStorage.getItem("APP_TOKEN");
  const me = getMe();
  if (!token || !me?.id) {
    location.href = "/login.html";
    throw new Error("Not logged in");
  }
  return me;
}

export function logout() {
  localStorage.removeItem("APP_TOKEN");
  localStorage.removeItem("APP_USER");
  location.href = "/login.html";
}

export async function fetchRoles() {
  const me = requireLogin();
  const sb = supa();
  const { data, error } = await sb
    .from("user_role")
    .select("role")
    .eq("user_id", me.id);

  if (error) throw error;
  return (data || []).map(x => x.role);
}

export function hasRole(roles, role) {
  return roles.includes(role);
}
