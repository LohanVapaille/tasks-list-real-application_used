// Configuration de l'écosystème Lova : un seul endroit à modifier
// pour les liens, l'éditeur et les tarifs.

export const APP_NAME = "LovaTasks";

// Applications Lova affichées dans le lanceur (icône 9 points).
// `current: true` = l'application ouverte.
export const LOVA_APPS = [
  {
    id: "lovaweb",
    name: "LovaWeb",
    url: "https://lovaweb.fr",
    color: "#4338ca",
    letter: "W",
    description: "Sites & plateformes sur mesure",
  },
  {
    id: "lovatrip",
    name: "LovaTrip",
    url: "https://lovatrip.com",
    color: "#e06c00",
    letter: "T",
    description: "Organiser ses voyages",
  },
  {
    id: "lovatasks",
    name: "LovaTasks",
    url: "https://lohanvapaille.github.io/tasks-list-real-application_used/",
    color: "#f28c28",
    letter: "✓",
    description: "Projets & tâches",
    current: true,
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
