// La page des rapports : la liste par domaine, le resume dans le panneau de droite.
"use strict";

const ORDRE_DOMAINES = ["Contrôles de cohérence", "Flux entre systèmes", "Lettrages", "Grands livres", "Référentiels"];
const filtres = { g: "", e: "", q: "" };   // gardes d'un rendu a l'autre : la revalidation ne les perd pas

function ordreDomaines(raps) {
  const vus = [...new Set(raps.map((r) => r.domaine || "Autres"))];
  return vus.sort((a, b) => {
    const ia = ORDRE_DOMAINES.indexOf(a), ib = ORDRE_DOMAINES.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, "fr");
  });
}

function urlRapport(r) { return API + "/api/rapports/" + encodeURIComponent(r.id); }

function vueRapports([donnees]) {
  majBandeau(donnees.maj);
  const raps = donnees.rapports.filter(rapportMontre).sort((a, b) => String(a.sujet).localeCompare(String(b.sujet), "fr"));
  if (!raps.length) {
    return [el("h1", null, "Rapports"), vueVide("Aucun rapport déployé",
      "Un rapport vous donne chaque jour, dans un classeur et par courriel, l'état d'un contrôle entre vos logiciels.")];
  }
  const f = filtres;
  const restreints = raps.filter((r) => !r.acces).length;
  const avis = el("p", "avis");
  avis.setAttribute("aria-live", "polite");

  const sous = el("p", "sous-titre", `Dernière version de chaque rapport · ${pluriel(raps.length, "rapport", "rapports")}`);
  if (restreints) sous.append(" · ", cadenas(14), `${restreints} en accès restreint`);

  // domaines
  const domaines = ordreDomaines(raps);
  const barre = el("div", "gb-barre");
  barre.setAttribute("role", "group");
  barre.setAttribute("aria-label", "Domaines");
  const choix = [["", "Tous", raps.length], ...domaines.map((g) => [g, g, raps.filter((r) => (r.domaine || "Autres") === g).length])];
  for (const [v, texte, n] of choix) {
    const b = bouton("gb-o", texte);
    b.append(" ", el("span", null, n));
    b.dataset.v = v;
    b.addEventListener("click", () => { f.g = v; filtrer(); });
    barre.append(b);
  }

  // recherche et etats
  const ligne = el("div", "outils ligne");
  const lab = el("label", "cherche");
  lab.append(el("span", "sr", "Rechercher un rapport"));
  const champ = el("input");
  champ.type = "search";
  champ.placeholder = "Rechercher un rapport…";
  champ.value = f.q;
  champ.addEventListener("input", () => { f.q = champ.value.trim().toLowerCase(); filtrer(); });
  lab.append(champ);
  const pe = el("div", "pe");
  pe.setAttribute("role", "group");
  pe.setAttribute("aria-label", "État");
  for (const [v, texte] of [["", "Tous"], ["ok", "Fonctionnels"], ["interrompu", "Interrompus"], ["construction", "En construction"]]) {
    const b = bouton("pe-b", texte);
    b.append(" ", el("span", null, v ? raps.filter((r) => etatAffiche(r) === v).length : raps.length));
    b.dataset.v = v;
    b.addEventListener("click", () => { f.e = v; filtrer(); });
    pe.append(b);
  }
  // les groupes de filtres sur une ligne, la recherche a droite (Antoine, 2026-11-04, DEC_00520, option 5C)
  ligne.append(barre, pe, el("span", "rt-sp"), lab);
  const outils = ligne;

  // le tableau
  const carte = el("div", "carte gd-c");
  const table = el("table", "gd");
  const cg = el("colgroup");
  for (const w of ["", "9rem", "9.5rem", "8.5rem", "8.5rem", "6.75rem", "9.75rem", "9.75rem"]) {
    const c = el("col");
    if (w) c.style.width = w;
    cg.append(c);
  }
  const thead = el("thead");
  const tr = el("tr");
  for (const [texte, classe, cache] of [["Rapport"], ["Systèmes", "c"], ["Système d'origine"], ["État"], ["Date"], ["Résumé", null, true], ["Notice", null, true], ["Télécharger", null, true]]) {
    const th = el("th", classe);
    th.scope = "col";
    if (cache) th.append(el("span", "sr", texte)); else th.textContent = texte;
    tr.append(th);
  }
  thead.append(tr);
  table.append(cg, thead);
  const lignes = [];
  for (const g of domaines) {
    const liste = raps.filter((r) => (r.domaine || "Autres") === g);
    const tb = el("tbody");
    const bande = el("tr", "gd-b");
    const th = el("th", null, g);
    th.colSpan = 8;
    th.scope = "rowgroup";
    th.append(" ", el("span", null, pluriel(liste.length, "rapport", "rapports")));
    bande.append(th);
    tb.append(bande);
    for (const r of liste) {
      const l = ligneRapport(r, avis);
      lignes.push([l, r, g]);
      tb.append(l);
    }
    table.append(tb);
  }
  carte.append(table);
  const vide = el("p", "vide", "Aucun rapport ne correspond.");
  vide.hidden = true;

  function filtrer() {
    for (const b of barre.children) b.setAttribute("aria-pressed", String(b.dataset.v === f.g));
    for (const b of pe.children) b.setAttribute("aria-pressed", String(b.dataset.v === f.e));
    let total = 0;
    for (const [l, r, g] of lignes) {
      const ok = (!f.g || g === f.g) && (!f.e || etatAffiche(r) === f.e) && (!f.q || String(r.sujet).toLowerCase().includes(f.q));
      l.hidden = !ok;
      total += ok ? 1 : 0;
    }
    for (const tb of table.tBodies) tb.hidden = !tb.querySelector("tr[data-r]:not([hidden])");
    vide.hidden = total > 0;
    carte.hidden = total === 0;
    avis.textContent = "";
  }
  filtrer();
  return [el("h1", null, "Rapports"), sous, outils, avis, carte, vide];
}

function ligneRapport(r, avis) {
  const tr = el("tr");
  tr.dataset.r = "1";
  const nom = el("th");
  nom.scope = "row";
  const f = el("td", "td-f", flux(r.flux));
  const origine = el("td", "discret", r.origine || "");
  const etat = el("td");
  const date = el("td", "la-d mono gd-date");   // le style de la date des automatisations, sur une ligne
  const notice = el("td", "act");
  const resume = el("td", "gd-resume");   // a gauche, comme l'etat et la date : trois departs a pas egal (2026-10-23)
  const action = el("td", "act");
  if (!r.acces) {
    tr.className = "restreint";
    nom.append(cadenas(14), String(r.sujet));
    const b = bouton("btn eteint");
    b.setAttribute("aria-disabled", "true");
    b.append(ico("cadenas", 14), "Accès restreint");
    b.setAttribute("aria-label", "Accès restreint : " + r.sujet);
    b.addEventListener("click", () => {
      avis.textContent = `Vous n'avez pas accès à « ${r.sujet} ». Votre administrateur peut vous l'ouvrir.`;
    });
    action.append(b);
  } else {
    nom.textContent = String(r.sujet);
    // une demande sur ce rapport, chez la cellule qui porte son automatisation (DEC_00165, 2026-10-31)
    // les boutons d'une ligne restent ensemble, meme quand le nom passe a la ligne
    const outilsL = el("span", "dm-g");
    outilsL.append(boutonDemande({ id: r.automatisation, nom: r.sujet, rapport: String(r.sujet) }, "dm-b"));
    // rafraichir ce seul rapport (Antoine, 2026-11-02, DEC_00379 de PCP001 : « un bouton par ligne, quand on clique
    // sur un bouton ca raffraichit uniquement ce rapport ») ; absent si le portail ne sait pas le demander
    if (r.rafraichir) outilsL.append(boutonRafraichir(r, date, avis));
    nom.append(outilsL);
    const t = tag(etatAffiche(r));
    if (t) etat.append(t);
    // la date et l'heure du dernier passage, a Paris (demande des metiers, 2026-10-08)
    const h = heureDe(r.produit_le);
    date.textContent = r.fige ? FIGE : jourCourt(r.jour) + (h ? " à " + h : "");
    montrerRafraichissement(r, date, avis);
    if (r.resume) {
      const b = bouton("btn btn-s b-resume", "Voir le résumé");   // un bouton blanc borde (DEC_00520, option 7C)
      b.dataset.ouvrePanneau = "1";
      b.setAttribute("aria-label", "Voir le résumé de " + r.sujet);
      b.addEventListener("click", () => ouvrirResume(r, b));
      resume.append(b);
    }
    // La notice utilisateur du rapport, dans sa colonne a gauche de Telecharger (Antoine, 2026-10-23 :
    // « a cote de telechargement [...] bouton exactement pareil [...] meme largeur », un detail subtil
    // qui les differencie : le bleu nuit et un livre, une fleche sur Telecharger) ; une page a part, dans un nouvel onglet ; grisee tant qu'elle
    // n'est pas publiee.
    if (r.notice === "publiee") {
      const n = el("a", "btn b-l b-notice");
      n.append(ico("livre", 15), "Notice");
      n.href = API + "/api/automatisations/" + encodeURIComponent(r.automatisation) + "/notice";
      n.target = "_blank";
      n.rel = "noopener";
      n.setAttribute("aria-label", "Ouvrir la notice de " + r.sujet + " (nouvel onglet)");
      notice.append(n);
    } else if (r.notice === "absente") {
      const n = bouton("btn b-l b-notice eteint");
      n.append(ico("livre", 15), "Notice");
      n.setAttribute("aria-disabled", "true");
      n.setAttribute("aria-label", "Notice de " + r.sujet + " (pas encore publiée)");
      n.addEventListener("click", () => { avis.textContent = `La notice de « ${r.sujet} » n'est pas encore publiée.`; });
      notice.append(n);
    }
    if (r.livrable === "interface" || r.construction) {
      // Decisions d'Antoine : une interface depose dans un autre systeme (2026-10-04) ; un
      // rapport d'une automatisation en construction ne se telecharge pas (2026-10-08).
      // On voit leur etat et leur resume, jamais de bouton de telechargement.
    } else if (r.telechargeable) {
      const a = el("a", "btn b-l");
      a.append(ico("telecharger", 15), "Télécharger");
      a.href = urlRapport(r);
      a.setAttribute("aria-label", "Télécharger " + r.sujet);
      action.append(a);
    } else {
      // Decision d'Antoine du 2026-10-03 : un passage interrompu ne se telecharge pas,
      // et l'utilisateur qui essaie recoit une explication, pas une erreur.
      const b = bouton("btn b-l eteint");
      b.append(ico("telecharger", 15), "Télécharger");
      b.setAttribute("aria-disabled", "true");
      b.setAttribute("aria-label", "Télécharger " + r.sujet + " (indisponible)");
      b.addEventListener("click", () => {
        avis.textContent = `« ${r.sujet} » : le dernier passage n'a pas abouti, il n'y a rien à télécharger. Le rapport reviendra au prochain passage réussi.`;
      });
      action.append(b);
    }
  }
  tr.append(nom, f, origine, etat, date, resume, notice, action);
  return tr;
}

// ------------------------------------------------------------------ rafraichir une ligne

const EN_COURS_RAF = ["en_file", "en_cours"];
let relectureRaf = null;

// L'etat d'un rafraichissement, sous la date : en file ou en cours le temps qu'il tourne ; refuse ou en echec,
// son motif tel que le lanceur l'ecrit ; fait, rien (la date dit le nouveau passage).
function montrerRafraichissement(r, date, avis) {
  const e = r.rafraichir && r.rafraichir.etat;
  const textes = { en_file: "Rafraîchissement demandé…", en_cours: "Rafraîchissement en cours…",
                   refuse: "Non rafraîchi", echec: "Rafraîchissement en échec" };
  if (!textes[e]) return;
  const p = el("span", "rf-e" + (EN_COURS_RAF.includes(e) ? "" : " rf-k"), textes[e]);
  // le motif d'un refus ou d'un echec, tel que le lanceur l'ecrit : a la demande, comme le resume
  if (r.rafraichir.motif && !EN_COURS_RAF.includes(e)) {
    const v = bouton("lien-r rf-v", "voir pourquoi");
    v.setAttribute("aria-label", "Pourquoi « " + r.sujet + " » n'a pas été rafraîchi");
    v.addEventListener("click", () => { avis.textContent = `« ${r.sujet} » : ${r.rafraichir.motif}`; });
    p.append(" · ", v);
  }
  date.append(p);
  if (EN_COURS_RAF.includes(e)) relireBientot();
}

function relireBientot() {
  if (relectureRaf) return;
  relectureRaf = setTimeout(() => {
    relectureRaf = null;
    suivre([SOURCES.rapports], (d, premier) => poser(vueRapports(d), premier));
  }, 15000);
}

function boutonRafraichir(r, date, avis) {
  const b = bouton("dm-b rf-b");
  b.prepend(ico("rafraichir", 15));
  b.title = "Rafraîchir ce rapport";
  b.setAttribute("aria-label", "Rafraîchir " + r.sujet);
  const occupe = () => EN_COURS_RAF.includes(r.rafraichir && r.rafraichir.etat);
  if (occupe()) b.setAttribute("aria-disabled", "true");
  b.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (occupe()) { avis.textContent = `« ${r.sujet} » est déjà en cours de rafraîchissement.`; return; }
    b.setAttribute("aria-disabled", "true");
    const { statut, donnees } = await appeler("POST", "/api/rapports/" + encodeURIComponent(r.id) + "/rafraichir");
    if (statut === 401) return sessionPerdue();
    if (statut !== 200 || !donnees) {
      b.removeAttribute("aria-disabled");
      avis.textContent = `« ${r.sujet} » ne peut pas être rafraîchi : ${(donnees && donnees.erreur) || "service indisponible"}.`;
      return;
    }
    r.rafraichir = donnees;
    for (const s of date.querySelectorAll(".rf-e")) s.remove();
    montrerRafraichissement(r, date, avis);
    avis.textContent = `« ${r.sujet} » sera rafraîchi dans la minute ; la ligne se met à jour seule.`;
  });
  return b;
}

// Le resume n'est jamais mis en cache : c'est le courriel du dernier passage, lu a la demande.
async function ouvrirResume(r, depuis) {
  const titre = el("h2", "r-titre", r.sujet);
  titre.id = "panneau-titre";
  const act = el("div", "r-act");
  if (r.telechargeable) {
    const a = el("a", "btn", "Télécharger le classeur");
    a.href = urlRapport(r);
    act.append(a);
  }
  const etat = el("p", "chargement", "Chargement du résumé…");
  etat.setAttribute("aria-live", "polite");
  ouvrirPanneau("resume", [el("p", "r-sur", "Résumé du dernier passage"), titre, act, etat], depuis);
  const { statut, donnees } = await appeler("GET", "/api/rapports/" + encodeURIComponent(r.id) + "/resume", null, "texte");
  if (panneauMode !== "resume" || !document.contains(etat)) return;   // panneau ferme ou remplace entre-temps
  if (statut === 401) return sessionPerdue();
  if (statut !== 200 || typeof donnees !== "string") {
    etat.className = "erreur";
    etat.textContent = statut === 403 ? "Vous n'avez pas accès à ce résumé."
      : statut === 404 ? "Ce rapport n'a pas de résumé pour son dernier passage." : PANNE_SERVICE;
    return;
  }
  // Le courriel est montre dans un cadre isole (sandbox sans script), sans sa marge
  // par defaut, pour s'aligner a gauche avec le titre (maquette v14).
  const style = "<style>body{margin:0}</style>";
  const html = /<head(\s[^>]*)?>/i.test(donnees) ? donnees.replace(/<head(\s[^>]*)?>/i, (m) => m + style) : style + donnees;
  const cadre = el("iframe", "r-cadre");
  cadre.setAttribute("sandbox", "");
  cadre.title = "Résumé : " + r.sujet;
  cadre.srcdoc = html;
  etat.replaceWith(cadre);
}

demarrer(() => suivre([SOURCES.rapports], (d, premier) => poser(vueRapports(d), premier)));
