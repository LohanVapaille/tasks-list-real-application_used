// Configuration de l'écosystème Lova : un seul endroit à modifier
// pour les liens, l'éditeur et les tarifs.

export const APP_NAME = "LovaTasks";

// Slug de cette application dans la table `lova_apps` (back-office Lovaweb).
export const APP_SLUG = "lovatasks";

// API du back-office Lovaweb qui liste les applications (lanceur + footer).
// En local : VITE_LOVA_API_URL=http://localhost/studio-web/public dans .env.development.local
export const LOVA_API_URL = (import.meta.env.VITE_LOVA_API_URL || "https://lovaweb.fr").replace(/\/$/, "");

// Liste de secours si l'API ne répond pas (même format que /api/lova-apps).
export const LOVA_APPS_FALLBACK = [
  {
    slug: "lovatrip",
    name: "LovaTrip",
    tagline: "Organiser son voyage rapidement avec l'IA",
    url: "https://lovatrip.com",
    accent_color: "#4f46e5",
    monogram: "Tr",
    is_available: true,
  },
  {
    slug: "lovatasks",
    name: "LovaTasks",
    tagline: "Projets & tâches",
    url: "https://lohanvapaille.github.io/tasks-list-real-application_used/",
    accent_color: "#e6a047",
    monogram: "Ta",
    is_available: true,
  },
];

// Informations légales — identiques à lovaweb.fr/mentions-legales.
export const PUBLISHER = {
  name: "Lohan Vapaille",
  brand: "Lovaweb",
  status: "Entrepreneur individuel (EI)",
  address: "32 rue de Champ la Dame, 77169 Chauffry, France",
  siren: "132 744 673",
  siret: "132 744 673 00014",
  ape: "62.01Z — Programmation informatique",
  rne: "Immatriculé au Registre national des entreprises (RNE) le 12/11/2026",
  vat: "TVA non applicable, art. 293 B du CGI",
  email: "contact@lohanvapaille.fr",
  website: "https://lovaweb.fr",
  // TODO : obligatoire pour vendre à des particuliers (art. L612-1 Code conso).
  // Ex. "CM2C, 49 rue de Ponthieu, 75008 Paris — www.cm2c.net"
  mediator: "coordonnées communiquées sur simple demande à l'éditeur",
};

// Plan Pro (les identifiants de prix Stripe sont des secrets des Edge Functions).
export const PRICING = {
  monthly: 4.99,
  yearly: 39,
  currency: "€",
  freeAiQuota: 10,
  proAiQuota: 300,
};
