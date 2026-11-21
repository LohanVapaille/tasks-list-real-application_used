import { useState } from "react";
import { PRICING, PUBLISHER } from "../config/lova";
import Modal from "./Modal";

const Mail = () => <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>;

const Mentions = () => (
  <>
    <p>
      Conformément aux articles 6-III et 19 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
      l'économie numérique (LCEN), voici les informations relatives à l'application <strong>LovaTasks</strong>,
      application de l'écosystème Lova éditée par Lovaweb.
    </p>
    <h3>Éditeur</h3>
    <ul>
      <li>
        <strong>{PUBLISHER.name}</strong>, {PUBLISHER.status}, exerçant sous le nom commercial{" "}
        <strong>{PUBLISHER.brand}</strong>
      </li>
      <li>Adresse : {PUBLISHER.address}</li>
      <li>SIREN : {PUBLISHER.siren} — SIRET : {PUBLISHER.siret}</li>
      <li>Code APE : {PUBLISHER.ape}</li>
      <li>{PUBLISHER.rne}</li>
      <li>{PUBLISHER.vat}</li>
      <li>E-mail : <Mail /></li>
      <li>Directeur de la publication : {PUBLISHER.name}</li>
    </ul>
    <h3>Hébergement</h3>
    <ul>
      <li>
        Application (fichiers du site) : <strong>GitHub, Inc.</strong> (GitHub Pages), 88 Colin P. Kelly Jr.
        Street, San Francisco, CA 94107, États-Unis — <a href="https://github.com" target="_blank" rel="noopener">github.com</a>
      </li>
      <li>
        Base de données et comptes : <strong>Supabase, Inc.</strong>, 970 Toa Payoh North #07-04, Singapour
        318992 — <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>
      </li>
    </ul>
    <h3>Propriété intellectuelle</h3>
    <p>
      L'application LovaTasks (code, interface, logo, textes) est la propriété de {PUBLISHER.name}. Toute
      reproduction, représentation ou adaptation, totale ou partielle, sans autorisation écrite préalable est
      interdite. Les contenus saisis par les utilisateurs (projets, tâches) restent leur propriété.
    </p>
    <h3>Responsabilité</h3>
    <p>
      {PUBLISHER.name} s'efforce d'assurer la disponibilité et la fiabilité du service sans pouvoir garantir
      l'absence d'interruptions ou d'erreurs. Les suggestions produites par l'assistant IA sont générées
      automatiquement et doivent être vérifiées par l'utilisateur. Les liens vers des sites tiers n'engagent pas
      l'éditeur.
    </p>
  </>
);

const Privacy = () => (
  <>
    <h3>Responsable du traitement</h3>
    <p>
      {PUBLISHER.name} ({PUBLISHER.brand}), {PUBLISHER.address} — <Mail />.
    </p>
    <h3>Utilisation sans compte</h3>
    <p>
      Sans compte, vos projets et tâches sont enregistrés <strong>uniquement dans votre navigateur</strong>
      (localStorage). Aucune donnée n'est envoyée à nos serveurs.
    </p>
    <h3>Données collectées avec un compte</h3>
    <ul>
      <li>Identité : adresse e-mail, nom et photo de profil (si connexion Google).</li>
      <li>Contenus : projets, tâches, étiquettes, temps suivi, membres invités sur vos projets.</li>
      <li>Abonnement : identifiant client Stripe et statut de l'abonnement (aucune donnée bancaire n'est stockée par LovaTasks).</li>
      <li>Usage de l'IA : nombre de générations du mois.</li>
    </ul>
    <p>
      Finalités : fournir le service, synchroniser vos données entre vos appareils, permettre le partage de
      projets, gérer l'abonnement. Bases légales : exécution du contrat (art. 6.1.b RGPD) et intérêt légitime pour
      la sécurité du service (art. 6.1.f).
    </p>
    <h3>Sous-traitants</h3>
    <ul>
      <li><strong>Supabase</strong> : hébergement de la base de données et authentification.</li>
      <li><strong>Google</strong> : connexion « Continuer avec Google » (si vous la choisissez).</li>
      <li><strong>Stripe Payments Europe, Ltd.</strong> (Dublin, Irlande) : paiement de l'abonnement Pro.</li>
      <li>
        <strong>Groq, Inc.</strong> (États-Unis) : traitement des textes envoyés à l'assistant IA, uniquement
        lorsque vous l'utilisez. N'y envoyez pas de données sensibles.
      </li>
    </ul>
    <p>
      Certains sous-traitants peuvent traiter des données hors de l'Union européenne ; ces transferts sont
      encadrés par les clauses contractuelles types de la Commission européenne.
    </p>
    <h3>Partage</h3>
    <p>
      Les tâches d'un projet partagé sont visibles par tous ses membres. Le lien « portail client » (Pro) rend un
      projet consultable en lecture seule par toute personne disposant du lien, jusqu'à sa désactivation.
    </p>
    <h3>Durée de conservation</h3>
    <p>
      Vos données sont conservées tant que votre compte est actif. Sur demande de suppression, elles sont
      effacées sous 30 jours, sauf les documents de facturation conservés 10 ans (obligation légale).
    </p>
    <h3>Vos droits</h3>
    <p>
      Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de
      portabilité (export JSON disponible dans l'application). Écrivez à <Mail />. Vous pouvez introduire une
      réclamation auprès de la <a href="https://www.cnil.fr/" target="_blank" rel="noopener">CNIL</a>.
    </p>
    <h3>Cookies et stockage local</h3>
    <p>
      LovaTasks n'utilise aucun cookie publicitaire ni outil de mesure d'audience. Seul le stockage local
      strictement nécessaire est utilisé (session de connexion, préférences d'affichage, données du mode invité).
      Les polices de caractères sont chargées depuis Google Fonts, ce qui transmet votre adresse IP à Google.
    </p>
  </>
);

const Cgv = () => (
  <>
    <h3>1. Objet</h3>
    <p>
      Les présentes conditions régissent l'utilisation de LovaTasks, application web de gestion de projets et de
      tâches éditée par {PUBLISHER.name} ({PUBLISHER.brand}), et la souscription à l'offre payante « LovaTasks Pro ».
    </p>
    <h3>2. Accès au service</h3>
    <p>
      L'application est utilisable gratuitement, avec ou sans compte. Le plan gratuit inclut les projets, tâches,
      tableaux, le partage de projets et {PRICING.freeAiQuota} générations IA par mois. L'éditeur peut faire
      évoluer les fonctionnalités ; les fonctions payées restent garanties pour la période en cours.
    </p>
    <h3>3. Offre Pro et prix</h3>
    <p>
      LovaTasks Pro est un abonnement à {PRICING.monthly.toFixed(2).replace(".", ",")} {PRICING.currency} par mois ou{" "}
      {PRICING.yearly} {PRICING.currency} par an. {PUBLISHER.vat} : les prix indiqués sont les prix finaux. Le
      paiement est effectué par carte via Stripe. L'abonnement est reconduit tacitement à chaque échéance.
    </p>
    <h3>4. Résiliation</h3>
    <p>
      Vous pouvez résilier à tout moment depuis « Gérer mon abonnement ». La résiliation prend effet à la fin de
      la période payée ; vos données sont conservées et le compte repasse au plan gratuit.
    </p>
    <h3>5. Droit de rétractation</h3>
    <p>
      Conformément à l'article L221-18 du Code de la consommation, vous disposez de 14 jours à compter de la
      souscription pour vous rétracter, sans motif, par simple e-mail à <Mail />. Le montant payé est alors
      intégralement remboursé.
    </p>
    <h3>6. Utilisation acceptable</h3>
    <p>
      Vous vous engagez à ne pas utiliser le service à des fins illicites, ni à tenter d'en contourner les limites
      techniques. Les quotas IA sont personnels. Les contenus générés par l'IA sont fournis à titre indicatif.
    </p>
    <h3>7. Responsabilité et données</h3>
    <p>
      Le service est fourni « en l'état ». Il est recommandé d'exporter régulièrement vos données (fonction
      d'export intégrée). La responsabilité de l'éditeur est limitée au montant payé sur les 12 derniers mois.
    </p>
    <h3>8. Litiges</h3>
    <p>
      Droit français. En cas de litige, contactez d'abord <Mail /> pour trouver une solution amiable. Conformément
      à l'article L612-1 du Code de la consommation, le consommateur peut ensuite recourir gratuitement au
      médiateur de la consommation : {PUBLISHER.mediator}.
    </p>
  </>
);

const Credits = () => (
  <>
    <h3>Conception & développement</h3>
    <p>
      <strong>{PUBLISHER.name}</strong> — <a href={PUBLISHER.website} target="_blank" rel="noopener">Lovaweb</a>,
      développeur web freelance. LovaTasks fait partie de l'écosystème d'applications <strong>Lova</strong>{" "}
      (LovaWeb, LovaTrip, LovaTasks).
    </p>
    <h3>Technologies</h3>
    <ul>
      <li><a href="https://react.dev" target="_blank" rel="noopener">React</a> et <a href="https://vite.dev" target="_blank" rel="noopener">Vite</a> (licence MIT)</li>
      <li><a href="https://dndkit.com" target="_blank" rel="noopener">dnd kit</a> — glisser-déposer (licence MIT)</li>
      <li><a href="https://supabase.com" target="_blank" rel="noopener">Supabase</a> — base de données, comptes, temps réel</li>
      <li><a href="https://stripe.com" target="_blank" rel="noopener">Stripe</a> — paiements sécurisés</li>
      <li>Assistant IA propulsé par <a href="https://groq.com" target="_blank" rel="noopener">Groq</a> — modèles open source GPT-OSS (OpenAI, licence Apache 2.0)</li>
      <li>Polices <a href="https://fonts.google.com/specimen/Inter" target="_blank" rel="noopener">Inter</a> et <a href="https://fonts.google.com/specimen/Caveat" target="_blank" rel="noopener">Caveat</a> (SIL Open Font License)</li>
    </ul>
    <h3>Contact</h3>
    <p>
      Une idée, un bug, un besoin d'outil sur mesure ? <Mail />
    </p>
  </>
);

const TABS = [
  { id: "mentions", label: "Mentions légales", Component: Mentions },
  { id: "privacy", label: "Confidentialité", Component: Privacy },
  { id: "cgv", label: "CGU / CGV", Component: Cgv },
  { id: "credits", label: "Crédits", Component: Credits },
];

const LegalModal = ({ initialTab = "mentions", onClose }) => {
  const [tab, setTab] = useState(initialTab);
  const Current = TABS.find((t) => t.id === tab)?.Component ?? Mentions;

  return (
    <Modal title="Informations légales" onClose={onClose} size="lg">
      <div className="seg" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <article className="legal">
        <Current />
      </article>
    </Modal>
  );
};

export default LegalModal;
