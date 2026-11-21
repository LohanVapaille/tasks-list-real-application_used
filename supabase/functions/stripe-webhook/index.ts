// Webhook Stripe : met à jour le plan du profil selon l'état de l'abonnement.
// Déployer avec --no-verify-jwt (Stripe n'envoie pas de JWT Supabase).
// Secrets requis : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
import Stripe from "npm:stripe@17.3.1";
import { admin } from "../_shared/utils.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const syncSubscription = async (sub: Stripe.Subscription) => {
  const active = ["active", "trialing", "past_due"].includes(sub.status);
  const userId = sub.metadata?.supabase_user_id;
  const patch = {
    plan: active ? "pro" : "free",
    plan_until: active ? new Date(sub.current_period_end * 1000).toISOString() : null,
  };

  const query = admin.from("profiles").update(patch);
  const { error } = userId
    ? await query.eq("id", userId)
    : await query.eq("stripe_customer_id", sub.customer as string);
  if (error) throw error;
};

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    return new Response(`Signature invalide : ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    return new Response(`Erreur : ${(err as Error).message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
