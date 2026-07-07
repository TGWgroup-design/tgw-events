import { createClient } from "npm:@supabase/supabase-js@2";

export function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Verifies the caller's bearer token belongs to an authenticated staff user
// (present in staff_users). Returns the user id, or null if not staff.
export async function requireStaff(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const admin = getAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  const { data: staffRow, error: staffErr } = await admin
    .from("staff_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (staffErr || !staffRow) return null;

  return userData.user.id;
}
