// L'onglet « Applications » (RGI_02014, Antoine a PCP049-1123-p : « Choix A : 1A / 2A : un onglet « Applications », et
// l'adresse courte 88systems.io/cdp/factures qui renvoie vers la page derriere la connexion ») : une carte par ecran de
// travail auquel la personne a droit (son equipe, son nom, ce qu'il fait, son adresse, sa mise a jour, « Ouvrir »),
// sur le modele de l'option 1A de la fiche de choix. Les ecrans viennent de /api/automatisations (champ « ecran »,
// donne seulement a qui a le droit sur l'automatisation) ; chacun s'ouvre dans un nouvel onglet, avec son bandeau.
"use strict";

// RGI_02024 (Antoine a PCP049-1123-ag : « Choix A : L'écran s'ouvre dans le portail : « Ouvrir » affiche l'écran sous le
// bandeau et le menu, l'onglet Applications reste allumé, sans nouvel onglet ») : « Ouvrir » mene a cette meme page,
// `?ecran=<id>`, qui montre l'ecran servi par l'API dans un cadre ; l'API ne le laisse afficher que par le portail
function lienEcran(a) {
  return "applications.html?" + new URLSearchParams({ ecran: a.id });
}

function vueEcran(a) {
  const e = a.ecran, nom = e.nom || a.nom;
  const retour = el("a", "ap-retour", "← Applications");
  retour.href = "applications.html";
  const tete = el("div", "ap-tete");
  tete.append(retour, el("h1", null, nom));
  const cadre = el("iframe", "ap-cadre");
  cadre.title = nom;
  cadre.src = API + "/api/automatisations/" + encodeURIComponent(a.id) + "/page";
  return [tete, cadre];
}

function carteAppli(a) {
  const e = a.ecran, nom = e.nom || a.nom, url = lienEcran(a);
  const li = el("li", "carte ap-c");
  const eq = [e.equipe, e.compte].filter(Boolean).join(" · ");
  if (eq) li.append(el("p", "ap-eq", eq));
  li.append(el("h2", "ap-nom", nom));
  if (a.objectif) li.append(el("p", "ap-quoi", a.objectif));
  const ouvrir = el("a", "btn b-l");
  ouvrir.href = url;
  ouvrir.setAttribute("aria-label", "Ouvrir " + nom);
  ouvrir.append("Ouvrir");
  const pied = el("div", "ap-pied");
  // RGI_02023 (Antoine, page de pilotage, 2026-11-23 : « dans la page application, tu peux déjà supprimer tout ca :
  // "88systems.io/cdp/factures Mis à jour le 23/11 à 23:07" et "Les écrans de travail préparés par vos automatisations.
  // Chacun s'ouvre dans un nouvel onglet." ») : ni l'adresse, ni la mise a jour, ni la phrase d'introduction
  pied.append(ouvrir);
  li.append(pied);
  return li;
}

function vueApplications([autos]) {
  const applis = autos.automatisations.filter((a) => a.ecran);
  const voulu = new URLSearchParams(location.search).get("ecran");
  const ouvert = voulu && applis.find((a) => a.id === voulu);
  if (ouvert) return vueEcran(ouvert);
  const h1 = el("h1", null, "Applications");
  if (!applis.length) return [h1, el("p", "vide", "Aucune application ne vous est ouverte pour l'instant.")];
  const ul = el("ul", "ap-liste");
  ul.append(...applis.map(carteAppli));
  return [h1, ul];
}

// l'ecran ouvert ne se redessine pas a chaque relecture des automatisations : son cadre se rechargerait sous la main
let ecranPose = false;
demarrer(() => suivre([SOURCES.autos], (d, premier) => {
  if (ecranPose) return;
  const vue = vueApplications(d);
  ecranPose = vue.some((x) => x.tagName === "IFRAME");
  poser(vue, premier);
}));
