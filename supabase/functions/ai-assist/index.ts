// Assistant IA LovaTasks.
// Utilise n'importe quelle API compatible OpenAI. Par défaut : Groq (offre gratuite,
// modèle GPT-OSS 120B, secours GPT-OSS 20B). Pour changer, modifier les secrets :
//   AI_API_KEY (obligatoire), AI_API_URL, AI_MODEL, AI_FALLBACK_MODEL
// Quotas mensuels : FREE_AI_QUOTA (défaut 10) et PRO_AI_QUOTA (défaut 300).
import { admin, corsHeaders, getUser, isPro, json } from "../_shared/utils.ts";

const API_URL =
  Deno.env.get("AI_API_URL") ?? "https://api.groq.com/openai/v1/chat/completions";
const MODELS = [
  Deno.env.get("AI_MODEL") ?? "openai/gpt-oss-120b",
  Deno.env.get("AI_FALLBACK_MODEL") ?? "openai/gpt-oss-20b",
];
const FREE_QUOTA = Number(Deno.env.get("FREE_AI_QUOTA") ?? 10);
const PRO_QUOTA = Number(Deno.env.get("PRO_AI_QUOTA") ?? 300);

const TASK_SHAPE = `{"title": string (max 120 car.), "description": string (1-3 phrases),
"priority": 0|1|2|3 (0 aucune, 3 urgente), "labels": string[] (1-2 mots-clés courts),
"checklist": string[] (0 à 5 sous-étapes concrètes), "column": "todo"}`;

const PROMPTS: Record<string, (input: Record<string, unknown>) => string> = {
  backlog: ({ text }) => `Tu es un chef de projet expérimenté. À partir du cahier des charges
ci-dessous, construis le backlog d'un projet. Réponds UNIQUEMENT en JSON valide de la forme :
{"project": {"name": string (max 40 car.), "icon": un seul emoji},
 "columns": [{"id": string, "name": string, "kind": "todo"|"doing"|"done"}] (3 à 5 colonnes, la première "todo", la dernière "done"),
 "tasks": [${TASK_SHAPE}] (8 à 30 tâches, ordonnées par ordre logique de réalisation, "column" = id de la première colonne)}
Rédige en français. Tâches actionnables, commençant par un verbe.

CAHIER DES CHARGES :
"""${String(text).slice(0, 15000)}"""`,

  breakdown: ({ title, description }) => `Découpe la tâche suivante en 3 à 8 sous-étapes
concrètes et courtes, en français, commençant par un verbe. Réponds UNIQUEMENT en JSON :
{"checklist": string[], "description": string (description améliorée, 1-3 phrases)}

TÂCHE : ${String(title).slice(0, 300)}
DÉTAILS : ${String(description ?? "").slice(0, 2000)}`,

  plan: ({ tasks, today }) => `Tu es un coach de productivité. Nous sommes le ${today}.
Voici les tâches ouvertes (JSON). Choisis au maximum 5 tâches à faire AUJOURD'HUI en
priorisant urgence, échéances proches et dépendances logiques. Réponds UNIQUEMENT en JSON :
{"focus": [{"id": string, "reason": string (courte)}], "tip": string (un conseil court)}

TÂCHES : ${JSON.stringify(tasks).slice(0, 12000)}`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) return json({ error: "Crée un compte gratuit pour utiliser l'IA." }, 401);

  const { mode, input } = await req.json().catch(() => ({}));
  const buildPrompt = PROMPTS[mode as string];
  if (!buildPrompt || !input) return json({ error: "Requête invalide." }, 400);

  // Quota mensuel
  const period = new Date().toISOString().slice(0, 7);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("plan, plan_until, ai_used, ai_period")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) return json({ error: "Profil introuvable." }, 400);

  const used = profile.ai_period === period ? profile.ai_used : 0;
  const quota = isPro(profile) ? PRO_QUOTA : FREE_QUOTA;
  if (used >= quota) {
    return json(
      {
        error: isPro(profile)
          ? "Quota IA du mois atteint. Il se renouvelle le 1er du mois."
          : `Tu as utilisé tes ${quota} générations IA gratuites ce mois-ci. Passe Pro pour en avoir ${PRO_QUOTA}.`,
        code: "quota",
      },
      429,
    );
  }

  // Essaie le modèle principal, puis le modèle de secours (modèle retiré, surcharge…).
  let completion: { choices?: { message?: { content?: string } }[] } | null = null;
  for (const model of MODELS) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("AI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Tu réponds toujours avec un objet JSON valide, sans texte autour. Rédige en français." },
          { role: "user", content: buildPrompt(input) },
        ],
      }),
    });
    if (response.ok) {
      completion = await response.json();
      break;
    }
    console.error("AI error", model, response.status, await response.text());
  }

  if (!completion) {
    return json({ error: "Le service IA est momentanément indisponible. Réessaie dans un instant." }, 502);
  }

  let result: unknown;
  try {
    result = JSON.parse(completion.choices?.[0]?.message?.content ?? "{}");
  } catch {
    return json({ error: "Réponse IA illisible, réessaie." }, 502);
  }

  await admin
    .from("profiles")
    .update({ ai_used: used + 1, ai_period: period })
    .eq("id", user.id);

  return json({ result, usage: { used: used + 1, quota } });
});
