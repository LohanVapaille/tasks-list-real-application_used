import { useState } from "react";
import { PRICING } from "../config/lova";
import { useAuth, useToast } from "../context/contexts";
import { appUrl, callFunction } from "../lib/api";
import Modal from "./Modal";

const FREE = [
  "Projets et tâches illimités",
  "Tableaux kanban + vue liste, glisser-déposer",
  "États personnalisés par projet",
  "Partage de projets avec d'autres comptes",
  "Synchronisation temps réel multi-appareils",
  "Saisie rapide intelligente (demain, !1, #projet…)",
  `✨ IA : ${PRICING.freeAiQuota} générations / mois`,
  "Export CSV / JSON",
];

const PRO = [
  `✨ IA : ${PRICING.proAiQuota} générations / mois (backlog depuis cahier des charges, découpage, « Ma journée »)`,
  "🌐 Portail client : lien public en lecture seule par projet",
  "⏱️ Suivi du temps par tâche + rapport exportable pour la facturation",
  "💜 Soutien d'un développeur indépendant et des futures apps Lova",
];

const euros = (n) => `${n.toFixed(2).replace(".", ",").replace(",00", "")} ${PRICING.currency}`;

const PricingModal = ({ onClose, onOpen }) => {
  const { user, isPro, profile } = useAuth();
  const { toast } = useToast();
  const [interval, setBilling] = useState("year");
  const [busy, setBusy] = useState(false);

  const checkout = async () => {
    if (!user) return onOpen("auth", "Crée ton compte (gratuit) puis passe à Pro en un clic.");
    setBusy(true);
    const { data, error } = await callFunction(isPro ? "billing-portal" : "create-checkout", {
      interval,
      returnUrl: appUrl(),
    });
    setBusy(false);
    if (error) return toast(error, { type: "error" });
    window.location.href = data.url;
  };

  const monthlyOfYearly = PRICING.yearly / 12;
  const saving = Math.round((1 - PRICING.yearly / (PRICING.monthly * 12)) * 100);

  return (
    <Modal title={isPro ? "Ton abonnement LovaTasks Pro" : "Passe à LovaTasks Pro"} onClose={onClose} size="lg">
      {isPro ? (
        <div className="pro-active">
          <p>
            ⭐ Merci de soutenir LovaTasks ! Ton plan Pro est actif
            {profile?.plan_until && <> jusqu'au {new Date(profile.plan_until).toLocaleDateString("fr-FR")} (renouvellement automatique)</>}.
          </p>
          <button className="btn btn-primary" disabled={busy} onClick={checkout}>
            Gérer l'abonnement, les factures et le moyen de paiement
          </button>
        </div>
      ) : (
        <>
          <div className="seg seg--center">
            <button className={interval === "month" ? "active" : ""} onClick={() => setBilling("month")}>Mensuel</button>
            <button className={interval === "year" ? "active" : ""} onClick={() => setBilling("year")}>
              Annuel <span className="badge">-{saving}%</span>
            </button>
          </div>
          <div className="plans">
            <div className="plan">
              <h3>Gratuit</h3>
              <p className="plan-price">0 €</p>
              <p className="muted small">Tout l'essentiel, pour toujours.</p>
              <ul>
                {FREE.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
            </div>
            <div className="plan plan--pro">
              <span className="plan-ribbon">Recommandé</span>
              <h3>Pro</h3>
              <p className="plan-price">
                {interval === "year" ? euros(monthlyOfYearly) : euros(PRICING.monthly)}
                <span> / mois</span>
              </p>
              <p className="muted small">
                {interval === "year" ? `soit ${PRICING.yearly} € facturés par an` : "sans engagement, résiliable à tout moment"}
              </p>
              <ul>
                <li><strong>Tout le plan gratuit, plus :</strong></li>
                {PRO.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button className="btn btn-pro btn-block" disabled={busy} onClick={checkout}>
                {busy ? "Redirection vers Stripe…" : "Passer à Pro"}
              </button>
              <p className="muted small center">Paiement sécurisé par Stripe · Rétractation 14 jours</p>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};

export default PricingModal;
