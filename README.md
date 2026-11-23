# LovaTasks — une application Lova

Gestion de projets et de tâches, simple et rapide, par [Lovaweb](https://lovaweb.fr).
React 19 + Vite, Supabase (comptes, base, temps réel, Edge Functions), Stripe, IA compatible OpenAI (Groq + GPT-OSS 120B par défaut).

## Fonctionnalités

**Gratuit**
- Utilisable **sans compte** (localStorage). À la connexion, les données invitées sont envoyées dans le compte (et l'ancienne v1 `mes-notes` est reprise aussi).
- Connexion **Google** ou e-mail / mot de passe.
- Projets en **onglets** + onglets « Toutes les tâches » et « Sans projet ». Archivage.
- **Kanban glisser-déposer** (souris + tactile) ; états par défaut À faire / En cours / Terminé, **états personnalisés** par projet (avec un type todo/doing/done), modèles (Dev, Freelance, Perso).
- Vue **liste** groupée par échéance (en retard, aujourd'hui, demain…).
- **Saisie rapide** : date du jour par défaut, projet optionnel, syntaxe `demain`, `lundi`, `25/12`, `dans 3j`, `!1`, `#projet`, `@étiquette`.
- Fiche tâche : description, checklist, priorité, étiquettes, échéance, dupliquer, annuler une suppression.
- **Projets partagés** par e-mail, synchro temps réel.
- Filtres, recherche, stats, thème clair/sombre, raccourcis clavier, export/import JSON, export CSV.
- **IA** : 10 générations / mois (backlog depuis un cahier des charges, découpage d'une tâche, « Ma journée »).

**Pro (Stripe, 4,99 €/mois ou 39 €/an)**
- IA : 300 générations / mois.
- **Portail client** : lien public en lecture seule (`?board=<token>`).
- **Suivi du temps** par tâche + rapport CSV pour la facturation.

Écosystème Lova : lanceur d'applications (icône 9 points) et footer dans `src/config/lova.js`.

## Mise en service

### 1. Base de données
Supabase → SQL Editor → exécuter `supabase/migrations/002_lovatasks.sql`
(crée profils, projets, membres, invitations, tâches, règles RLS, RPC, et copie les anciennes `notes`).
Puis exécuter `supabase/migrations/003_task_horizon.sql` (horizon court terme / long terme des tâches).

### 2. Connexion Google
1. Google Cloud Console → Identifiants → ID client OAuth (application Web).
   URI de redirection autorisée : `https://rewsjymmjujoeotzdusy.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Providers → Google : coller Client ID + Secret.
3. Supabase → Authentication → URL Configuration :
   - Site URL : `https://lohanvapaille.github.io/tasks-list-real-application_used/`
   - Redirect URLs : la même + `http://localhost:5173/tasks-list-real-application_used/`

### 3. Edge Functions (Stripe + IA)
```bash
npx supabase login
npx supabase link --project-ref rewsjymmjujoeotzdusy
npx supabase secrets set AI_API_KEY=gsk_... \
  STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_MONTHLY=price_... STRIPE_PRICE_YEARLY=price_...
npx supabase functions deploy ai-assist
npx supabase functions deploy create-checkout
npx supabase functions deploy billing-portal
npx supabase functions deploy stripe-webhook --no-verify-jwt
```
- **IA** : clé gratuite sur [console.groq.com](https://console.groq.com). Autre modèle ou fournisseur compatible OpenAI : secrets `AI_API_URL`, `AI_MODEL`, `AI_FALLBACK_MODEL`. Quotas : `FREE_AI_QUOTA`, `PRO_AI_QUOTA`.
- **Stripe** : créer le produit « LovaTasks Pro » avec 2 prix récurrents (4,99 €/mois, 39 €/an), activer le portail client (Settings → Billing → Customer portal), puis créer un webhook vers
  `https://rewsjymmjujoeotzdusy.supabase.co/functions/v1/stripe-webhook` avec les événements
  `checkout.session.completed`, `customer.subscription.created|updated|deleted`.

### 4. Lancer / déployer
```bash
npm install
npm run dev      # développement
npm run deploy   # build + GitHub Pages
```

## Structure
- `src/config/lova.js` : apps Lova, éditeur (mentions légales), tarifs.
- `src/context/` : `AuthProvider` (session, profil, plan), `StoreProvider` (données invité ↔ Supabase), `ToastProvider`.
- `src/components/` : `TopBar`, `AppLauncher`, `ProjectTabs`, `QuickAdd`, `Board` (dnd-kit), `ListView`, `TaskModal`, `ProjectModal`, `AiBacklogModal`, `PricingModal`, `ToolModals`, `PublicBoard`, `LegalModal`, `Footer`.
- `src/lib/` : client Supabase, appels aux fonctions, parseur de saisie rapide, utilitaires.
- `supabase/` : schéma SQL et Edge Functions (Deno).
