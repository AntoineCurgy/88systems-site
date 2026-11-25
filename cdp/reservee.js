// RGI_02080 (choix A d'Antoine a PCP049-1125-a : « Un onglet « Direction » dans le menu du portail de CDP, montré à toi
// seul : la page réservée existante, et le menu qui ajoute les pages qu'une personne peut lire ») : une page reservee mise
// au menu s'ouvre sous le bandeau et le menu, comme un ecran des applications (RGI_02024) : une barre a son titre, puis
// la page que l'API sert a ses seuls lecteurs (RGI_02076), dans un cadre. Publiee a son adresse courte (<court>.html).
"use strict";

function vueReservee() {
  const court = nomDeChemin().replace(/\.html$/, "");
  const page = (moi.pages || []).find((p) => p.court === court);
  if (!page) {
    return [el("h1", null, "Page réservée"), el("p", "vide", "Cette page ne vous est pas ouverte.")];
  }
  document.title = page.titre + " · Portail des rapports";
  const fil = el("div", "ap-fil");
  fil.append(el("h1", null, page.titre));
  const tete = el("div", "ap-tete");
  tete.append(fil, el("span", "ap-essai", "À l'essai"));
  const cadre = el("iframe", "ap-cadre");
  cadre.title = page.titre;
  cadre.src = API + "/api/pages/" + encodeURIComponent(court);
  const app = el("div", "ap-app");
  app.append(tete, cadre);
  return [app];
}

demarrer(() => poser(vueReservee(), true));
