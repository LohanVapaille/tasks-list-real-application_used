// Crée une session Stripe Checkout pour l'abonnement LovaTasks Pro.
// Secrets requis : STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY
import Stripe from "npm:stripe@17.3.1";
import { admin, corsHeaders, getUser, json } from "../_shared/utils.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) return json({ error: "Connecte-toi pour passer Pro." }, 401);

  const { interval = "month", returnUrl } = await req.json().catch(() => ({}));
  const price =
    interval === "year"
      ? Deno.env.get("STRIPE_PRICE_YEARLY")
      : Deno.env.get("STRIPE_PRICE_MONTHLY");

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customer = profile?.stripe_customer_id;
  if (!customer) {
    const created = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customer = created.id;
    await admin.from("profiles").update({ stripe_customer_id: customer }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { supabase_user_id: user.id } },
    allow_promotion_codes: true,
    locale: "fr",
    success_url: `${returnUrl}?checkout=success`,
    cancel_url: `${returnUrl}?checkout=cancel`,
  });

  return json({ url: session.url });
});
