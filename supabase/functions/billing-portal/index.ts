// Ouvre le portail client Stripe (factures, résiliation, changement de carte).
import Stripe from "npm:stripe@17.3.1";
import { admin, corsHeaders, getUser, json } from "../_shared/utils.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) return json({ error: "Non connecté." }, 401);

  const { returnUrl } = await req.json().catch(() => ({}));
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return json({ error: "Aucun abonnement associé à ce compte." }, 400);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl,
  });
  return json({ url: session.url });
});
