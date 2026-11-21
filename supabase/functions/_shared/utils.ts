// Outils partagés par les Edge Functions LovaTasks (runtime Deno).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Client "service role" : contourne RLS, à n'utiliser que côté serveur.
export const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Renvoie l'utilisateur authentifié à partir du header Authorization.
export const getUser = async (req: Request) => {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error) return null;
  return data.user;
};

export const isPro = (profile: { plan: string; plan_until: string | null }) =>
  profile.plan === "pro" &&
  (!profile.plan_until || new Date(profile.plan_until) > new Date());
