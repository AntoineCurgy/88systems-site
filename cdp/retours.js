// L'onglet « Retours » (DEC_00457 de PCP009, DEC_00506 de PCP049) : les retours de l'utilisateur et leur etat,
// lus dans la liste que publie OUT_00382 depuis les RET_ des cellules. La forme est celle qu'Antoine a choisie le
// 2026-11-04 sur maquettes : le tableau (option D), la barre segmentee de la page Rapports (barre 1), et un panneau
// de detail et d'historique au clic sur une ligne. La page ne decide de rien : l'API filtre par les droits.
"use strict";

const ETATS_RETOUR = { recu: ["Reçu", "t-ferme"], en_cours: ["En cours", "t-ambre"], corrige: ["Corrigé", "t-vert"],
                       referme: ["Refermé", "t-ferme"] };
const TYPES_RETOUR = [["anomalie", "Une anomalie"], ["amelioration", "Une amélioration"], ["demande", "Une demande"]];
const MOT_TYPE = { anomalie: "Anomalie", amelioration: "Amélioration", demande: "Demande" };
// la barre : Tous, Ouverts (recu et en cours), Corriges, Refermes
const GROUPES = [["", "Tous", () => true], ["ouverts", "Ouverts", (r) => r.etat === "recu" || r.etat === "en_cours"],
                 ["corriges", "Corrigés", (r) => r.etat === "corrige"], ["refermes", "Refermés", (r) => r.etat === "referme"]];
const SOURCE_RETOURS = { chemin: "/api/retours", verifier: (d) => Array.isArray(d.retours) };
const filtres = { g: "", q: "" };

function tagRetour(etat) {
  const [mot, classe] = ETATS_RETOUR[etat] || ETATS_RETOUR.recu;
  return el("span", "tag " + classe, mot);
}

function vueRetours([rets, autos]) {
  majBandeau(rets.genere_le);
  const liste = rets.retours;
  // le sous-titre est retire (Antoine, 2026-11-04) : le compte vit sur « Tous »
  const avis = el("p", "avis");
  avis.setAttribute("aria-live", "polite");

  const barre = el("div", "gb-barre");
  barre.setAttribute("role", "group");
  barre.setAttribute("aria-label", "État");
  for (const [v, texte, garde] of GROUPES) {
    const b = bouton("gb-o", texte);
    b.append(" ", el("span", null, liste.filter(garde).length));
    b.dataset.v = v;
    b.addEventListener("click", () => { filtres.g = v; filtrer(); });
    barre.append(b);
  }
  const lab = el("label", "cherche");
  lab.append(el("span", "sr", "Rechercher un retour"));
  const champ = el("input");
  champ.type = "search";
  champ.placeholder = "Rechercher un retour…";
  champ.value = filtres.q;
  champ.addEventListener("input", () => { filtres.q = champ.value.trim().toLowerCase(); filtrer(); });
  lab.append(champ);
  const nouveau = bouton("btn rt-n", "＋ Nouveau retour");
  nouveau.addEventListener("click", () => ouvrirNouveau(autos.automatisations, nouveau));
  const outils = el("div", "outils ligne rt-outils");
  outils.append(barre, el("span", "rt-sp"), lab, nouveau);   // la recherche a droite (DEC_00520, option 5C)

  if (!liste.length) {
    return [el("h1", null, "Retours"), outils, vueVide("Aucun retour pour l'instant",
      "Signalez une anomalie, proposez une amélioration ou faites une demande : elle arrive à l'équipe qui suit l'automatisation, et son état s'affiche ici.")];
  }

  const carte = el("div", "carte gd-c");
  const table = el("table", "gd rt");
  const cg = el("colgroup");
  for (const w of ["7.5rem", "7rem", "8rem", "13rem", "", "9rem"]) {
    const c = el("col");
    if (w) c.style.width = w;
    cg.append(c);
  }
  const thead = el("thead");
  const tr = el("tr");
  for (const texte of ["Date", "État", "Type", "Automatisation", "Objet", "De"]) {
    const th = el("th", null, texte);
    th.scope = "col";
    tr.append(th);
  }
  thead.append(tr);
  const tb = el("tbody");
  const lignes = liste.map((r) => {
    const l = el("tr", "rt-l");
    l.tabIndex = 0;
    l.setAttribute("aria-label", `${r.objet}, ${(ETATS_RETOUR[r.etat] || ETATS_RETOUR.recu)[0]} : voir le détail`);
    const e = el("td");
    e.append(tagRetour(r.etat));
    l.append(el("td", "mono gd-date", r.date), e, el("td", null, MOT_TYPE[r.type] || "Demande"),
             el("td", null, r.nom), el("td", "rt-o", r.objet), el("td", "discret", r.de || ""));
    // le clic ne remonte pas au document, qui fermerait aussitot le panneau ouvert (commun.js)
    l.addEventListener("click", (ev) => { ev.stopPropagation(); ouvrirDetail(r, l); });
    l.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ouvrirDetail(r, l); } });
    tb.append(l);
    return [l, r];
  });
  table.append(cg, thead, tb);
  carte.append(table);
  const vide = el("p", "vide", "Aucun retour ne correspond.");
  vide.hidden = true;

  function filtrer() {
    for (const b of barre.children) b.setAttribute("aria-pressed", String(b.dataset.v === filtres.g));
    const garde = (GROUPES.find((g) => g[0] === filtres.g) || GROUPES[0])[2];
    let total = 0;
    for (const [l, r] of lignes) {
      const texte = `${r.objet} ${r.demande} ${r.nom} ${r.de}`.toLowerCase();
      const ok = garde(r) && (!filtres.q || texte.includes(filtres.q));
      l.hidden = !ok;
      total += ok ? 1 : 0;
    }
    vide.hidden = total > 0;
    carte.hidden = total === 0;
  }
  filtrer();
  const tete = el("div", "tete-fixe");
  tete.append(el("h1", null, "Retours"), outils, avis);
  return [figerTete(tete), carte, vide];
}

// Le panneau d'un retour : son detail, puis son historique (la creation, chaque version publiee qui le cite).
function ouvrirDetail(r, depuis) {
  const titre = el("h2", null, r.objet);
  titre.id = "panneau-titre";
  const tete = el("p", "rt-tete");
  tete.append(tagRetour(r.etat), " ", el("span", "tag", MOT_TYPE[r.type] || "Demande"));
  const dl = el("dl", "rt-dl");
  for (const [mot, valeur] of [["Automatisation", r.nom], ["Date", r.date], ["De", r.de || "—"]]) {
    dl.append(el("dt", null, mot), el("dd", null, valeur));
  }
  const demande = el("section", "fi-s");
  demande.append(el("h3", null, "Le retour"), el("p", null, r.demande || r.objet));
  const histo = el("section", "fi-s");
  const ol = el("ol", "rt-h");
  for (const h of r.historique || []) {
    const li = el("li");
    li.append(el("span", "mono", h.date), " ", h.quoi === "publie"
      ? `Corrigé, dans la version ${h.version} de l'automatisation` : "Reçu par l'équipe qui suit l'automatisation");
    ol.append(li);
  }
  if (r.etat === "referme") ol.append(el("li", "discret", "Refermé : l'équipe ne donne pas suite."));
  histo.append(el("h3", null, "Historique"), ol);
  ouvrirPanneau("retour", [titre, tete, dl, demande, histo], depuis);
}

// La fenetre « Nouveau retour » : sur quoi, le type, le texte ; elle part par note a l'equipe qui suit
// l'automatisation (`POST /api/demandes`), ou au pilote du client pour un besoin general.
function ouvrirNouveau(autos, depuis) {
  fermerDemande();
  const voile = el("div", "doc-voile");
  voile.setAttribute("role", "dialog");
  voile.setAttribute("aria-modal", "true");
  voile.setAttribute("aria-labelledby", "dm-titre");
  const fen = el("form", "doc-fen dm");
  fen.noValidate = true;
  const x = bouton("doc-x", "×");
  x.setAttribute("aria-label", "Fermer");
  x.addEventListener("click", fermerDemande);
  const titre = el("h2", null, "Nouveau retour");
  titre.id = "dm-titre";
  const labSur = el("label", "rt-sur");
  labSur.append(el("span", null, "Sur quoi"));
  const sur = el("select");
  for (const a of [...autos].sort((p, q) => String(p.nom).localeCompare(String(q.nom), "fr"))) {
    const o = el("option", null, a.nom);
    o.value = a.id;
    sur.append(o);
  }
  const general = el("option", null, "Un besoin général");
  general.value = "GENERAL";
  sur.append(general);
  labSur.append(sur);
  const choix = el("div", "dm-n");
  choix.setAttribute("role", "radiogroup");
  choix.setAttribute("aria-label", "Type");
  for (const [cle, mot] of TYPES_RETOUR) {
    const l = el("label");
    const r = el("input");
    r.type = "radio";
    r.name = "nature";
    r.value = cle;
    r.checked = cle === "anomalie";
    l.append(r, mot);
    choix.append(l);
  }
  const zone = el("textarea", "dm-t");
  zone.rows = 6;
  zone.maxLength = TEXTE_DEMANDE_MAX;
  zone.placeholder = "Ce que vous voyez, ce que vous attendez.";
  zone.setAttribute("aria-label", "Votre retour");
  const pied = el("div", "dm-pied");
  const message = el("p", "message");
  message.setAttribute("aria-live", "polite");
  const envoyer = bouton("btn", "Envoyer");
  envoyer.type = "submit";
  pied.append(message, envoyer);
  zone.id = "dm-zone";
  const labZone = el("label", "dm-lab", "Votre retour");   // un libelle au-dessus de chaque champ (DEC_00520, option 9B)
  labZone.htmlFor = "dm-zone";
  fen.append(x, titre, labSur, el("p", "dm-lab", "Type"), choix, labZone, zone, pied);
  fen.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texte = zone.value.trim();
    if (!texte) {
      message.className = "message erreur";
      message.textContent = "Écrivez votre retour avant d'envoyer.";
      zone.focus();
      return;
    }
    envoyer.disabled = true;
    message.className = "message";
    message.textContent = "Envoi…";
    const nature = (fen.querySelector("input[name=nature]:checked") || {}).value || "demande";
    const r = await appeler("POST", "/api/demandes", { id: sur.value, rapport: "", nature, texte });
    if (r.statut === 200) {
      fen.replaceChildren(x, titre, el("p", "dm-ok",
        "Votre retour est transmis. Il apparaîtra dans ce tableau, avec son état, à la prochaine mise à jour."));
      x.focus();
      return;
    }
    envoyer.disabled = false;
    message.className = "message erreur";
    message.textContent = r.statut === 401 ? "Votre session a expiré : reconnectez-vous."
      : (r.donnees && r.donnees.erreur) ? `Envoi impossible : ${r.donnees.erreur}.`
      : "Envoi impossible pour l'instant. Réessayez dans quelques minutes.";
  });
  voile.append(fen);
  voile.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!fen.contains(e.target)) fermerDemande();
  });
  document.body.append(voile);
  fenetreDemande = { voile, depuis };
  sur.focus();
}

demarrer(async () => {
  if (!moi.onglet_retours) {
    poser([el("h1", null, "Retours"), vueVide("Les retours arrivent bientôt",
      "Vous pourrez signaler ici une anomalie, proposer une amélioration ou faire une demande, et suivre son état.")], true);
    return;
  }
  await suivre([SOURCE_RETOURS, SOURCES.autos], (d, premier) => poser(vueRetours(d), premier));
});
