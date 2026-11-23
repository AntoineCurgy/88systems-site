// L'onglet « Applications » (RGI_02014, Antoine a PCP049-1123-p : « Choix A : 1A / 2A : un onglet « Applications », et
// l'adresse courte 88systems.io/cdp/factures qui renvoie vers la page derriere la connexion ») : une carte par ecran de
// travail auquel la personne a droit (son equipe, son nom, ce qu'il fait, son adresse, sa mise a jour, « Ouvrir »),
// sur le modele de l'option 1A de la fiche de choix. Les ecrans viennent de /api/automatisations (champ « ecran »,
// donne seulement a qui a le droit sur l'automatisation) ; chacun s'ouvre dans un nouvel onglet, avec son bandeau.
"use strict";

// l'adresse courte, publiee sous le chemin du client (88systems.io/cdp/factures) ; sans elle, l'ecran servi par l'API
function lienEcran(a) {
  return a.ecran.court ? new URL(a.ecran.court + "/", location.href).href
    : API + "/api/automatisations/" + encodeURIComponent(a.id) + "/page";
}

function adresseLisible(url) {
  const u = new URL(url);
  return (u.host + u.pathname).replace(/\/$/, "");
}

function carteAppli(a) {
  const e = a.ecran, nom = e.nom || a.nom, url = lienEcran(a);
  const li = el("li", "carte ap-c");
  const eq = [e.equipe, e.compte].filter(Boolean).join(" · ");
  if (eq) li.append(el("p", "ap-eq", eq));
  li.append(el("h2", "ap-nom", nom));
  if (a.objectif) li.append(el("p", "ap-quoi", a.objectif));
  if (e.court) li.append(el("p", "ap-adr", adresseLisible(url)));
  const ouvrir = el("a", "btn b-l");
  ouvrir.href = url;
  ouvrir.target = "_blank";
  ouvrir.rel = "noopener";
  ouvrir.title = adresseLisible(url);
  ouvrir.setAttribute("aria-label", "Ouvrir " + nom + " dans un nouvel onglet");
  ouvrir.append(ico("externe", 15), "Ouvrir");
  const pied = el("div", "ap-pied");
  pied.append(el("span", "ap-maj", "Mis à jour le " + majLisible(e.maj)), ouvrir);
  li.append(pied);
  return li;
}

function vueApplications([autos]) {
  const applis = autos.automatisations.filter((a) => a.ecran);
  const h1 = el("h1", null, "Applications");
  if (!applis.length) return [h1, el("p", "vide", "Aucune application ne vous est ouverte pour l'instant.")];
  const ul = el("ul", "ap-liste");
  ul.append(...applis.map(carteAppli));
  return [h1, el("p", "discret", "Les écrans de travail préparés par vos automatisations. Chacun s'ouvre dans un nouvel onglet."), ul];
}

demarrer(() => suivre([SOURCES.autos], (d, premier) => poser(vueApplications(d), premier)));
