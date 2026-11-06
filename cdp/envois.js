// L'onglet « Courriels envoyes » (DEC_00598, DEC_00600 de PCP049) : tous les courriels automatiques envoyes aux
// equipes du client, lus dans le registre des envois (OUT_00399) par /api/envois, pour l'administrateur seul. La forme
// est la maquette A choisie par Antoine le 2026-11-06 (DEC_00606) : un tableau groupe par jour, la barre segmentee et
// la recherche des autres onglets, le detail dans la fenetre centree du portail ; aucune phrase sous le titre.
"use strict";

const SOURCE_ENVOIS = { chemin: "/api/envois", verifier: (d) => Array.isArray(d.envois) };
const RESULTATS = { parti: ["Parti", "t-vert"], partiel: ["Partiel", "t-ambre"], "en echec": ["En échec", "t-rouge"] };
const estCode = (e) => /code de connexion$/.test(e.motif || "");
const GROUPES_ENVOI = [["", "Tous", () => true],
                       ["rapports", "Rapports", (e) => / ?rapport /.test(" " + (e.motif || ""))],
                       ["codes", "Codes de connexion", estCode],
                       ["echecs", "En échec", (e) => e.resultat !== "parti"]];
const filtresEnvois = { g: "", q: "" };

function tagEnvoi(e) {
  const [mot, classe] = RESULTATS[e.resultat] || [e.resultat || "?", "t-ferme"];
  return el("span", "tag " + classe, mot);
}

// le motif sans le client en tete (« cdp · rapport AUT_0003 · Stock » : le client est celui du portail)
function motifSansClient(e) {
  const m = String(e.motif || "");
  return m.includes(" · ") && !/^(rapport|code)/.test(m) ? m.slice(m.indexOf(" · ") + 3) : m;
}

function pourquoi(e) {
  const m = motifSansClient(e);
  const r = m.match(/^rapport (\S+)/);
  if (r) {
    const td = el("td", null, "Rapport ");
    td.append(el("span", "mono discret", r[1]));
    return td;
  }
  return el("td", null, estCode(e) ? "Code de connexion" : (m || e.appelant || "—"));
}

function adresses(texte) {
  return String(texte || "").split(",").map((x) => x.trim()).filter(Boolean);
}

function aQui(e) {
  const a = adresses(e.destinataires);
  return a.length === 1 ? a[0].split("@")[0] : `${a.length} destinataires`;
}

const jourEnvoi = (e) => String(e.le || "").slice(0, 10);
const heureEnvoi = (e) => String(e.le || "").slice(11, 16);

function jourLisible(iso) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  const t = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function vueEnvois(d) {
  const titre = el("h1", null, "Courriels envoyés");
  if (d.registre === "absent" || !d.envois.length) {
    return [titre, vueVide("Aucun courriel enregistré pour l'instant",
      "Chaque courriel automatique envoyé aux équipes s'inscrira ici : à qui, quand, pourquoi, et s'il est parti.")];
  }
  const liste = d.envois;
  const barre = el("div", "gb-barre");
  barre.setAttribute("role", "group");
  barre.setAttribute("aria-label", "Nature");
  for (const [v, texte, garde] of GROUPES_ENVOI) {
    const b = bouton("gb-o", texte);
    b.append(" ", el("span", null, liste.filter(garde).length));
    b.dataset.v = v;
    b.addEventListener("click", () => { filtresEnvois.g = v; filtrer(); });
    barre.append(b);
  }
  const lab = el("label", "cherche");
  lab.append(el("span", "sr", "Rechercher un courriel"));
  const champ = el("input");
  champ.type = "search";
  champ.placeholder = "Rechercher un objet, une adresse…";
  champ.value = filtresEnvois.q;
  champ.addEventListener("input", () => { filtresEnvois.q = champ.value.trim().toLowerCase(); filtrer(); });
  lab.append(champ);
  const outils = el("div", "outils ligne rt-outils");
  outils.append(barre, el("span", "rt-sp"), lab);   // la recherche a droite, comme l'onglet Retours (DEC_00520, 5C)

  const carte = el("div", "carte gd-c");
  const table = el("table", "gd ev");
  const cg = el("colgroup");
  for (const w of ["6rem", "", "14rem", "13rem", "8rem"]) {
    const c = el("col");
    if (w) c.style.width = w;
    cg.append(c);
  }
  const thead = el("thead");
  const tr = el("tr");
  for (const texte of ["Heure", "Objet", "Pourquoi", "À qui", "Résultat"]) {
    const th = el("th", null, texte);
    th.scope = "col";
    tr.append(th);
  }
  thead.append(tr);
  table.append(cg, thead);
  const groupes = [];
  for (const jour of [...new Set(liste.map(jourEnvoi))]) {
    const duJour = liste.filter((e) => jourEnvoi(e) === jour);
    const tb = el("tbody");
    const bande = el("tr", "gd-b");
    const th = el("th", null, jourLisible(jour));
    th.colSpan = 5;
    th.scope = "rowgroup";
    const cpt = el("span", "g-cpt", duJour.length);
    cpt.append(el("span", "sr", duJour.length > 1 ? " courriels" : " courriel"));
    th.append(" ", cpt);
    bande.append(th);
    tb.append(bande);
    const lignes = duJour.map((e) => {
      const l = el("tr", "rt-l");
      l.tabIndex = 0;
      l.setAttribute("aria-label", `${e.objet || "Sans objet"}, ${(RESULTATS[e.resultat] || [e.resultat])[0]} : voir le détail`);
      const r = el("td");
      r.append(tagEnvoi(e));
      l.append(el("td", "mono gd-date", heureEnvoi(e)), el("td", "rt-o", e.objet || "Sans objet"), pourquoi(e),
               el("td", null, aQui(e)), r);
      // le clic ne remonte pas au document, qui fermerait aussitot la fenetre ouverte (commun.js)
      l.addEventListener("click", (ev) => { ev.stopPropagation(); ouvrirEnvoi(e, l); });
      l.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ouvrirEnvoi(e, l); } });
      tb.append(l);
      return [l, e];
    });
    table.append(tb);
    groupes.push([tb, cpt, lignes]);
  }
  carte.append(table);
  const vide = el("p", "vide", "Aucun courriel ne correspond.");
  vide.hidden = true;

  function filtrer() {
    for (const b of barre.children) b.setAttribute("aria-pressed", String(b.dataset.v === filtresEnvois.g));
    const garde = (GROUPES_ENVOI.find((g) => g[0] === filtresEnvois.g) || GROUPES_ENVOI[0])[2];
    let total = 0;
    for (const [tb, cpt, lignes] of groupes) {
      let n = 0;
      for (const [l, e] of lignes) {
        const texte = `${e.objet} ${e.destinataires} ${e.copie} ${e.motif}`.toLowerCase();
        const ok = garde(e) && (!filtresEnvois.q || texte.includes(filtresEnvois.q));
        l.hidden = !ok;
        n += ok ? 1 : 0;
      }
      tb.hidden = n === 0;
      cpt.firstChild.textContent = n;
      total += n;
    }
    vide.hidden = total > 0;
    carte.hidden = total === 0;
  }
  filtrer();
  const tete = el("div", "tete-fixe");
  tete.append(titre, outils);
  return [figerTete(tete), carte, vide];
}

// La fenetre d'un courriel : quand, pourquoi, comment, a qui, le resultat, l'apercu du texte (le code de connexion
// y est masque par le registre et par l'API).
function ouvrirEnvoi(e, depuis) {
  const titre = el("h2", null, e.objet || "Sans objet");
  titre.id = "panneau-titre";
  const tete = el("p", "rt-tete");
  tete.append(tagEnvoi(e));
  const dl = el("dl", "rt-dl");
  const copie = adresses(e.copie);
  const lignes = [["Quand", `${jourLisible(jourEnvoi(e))}, ${heureEnvoi(e)}`],
                  ["Pourquoi", (motifSansClient(e).charAt(0).toUpperCase() + motifSansClient(e).slice(1)) || "—"],
                  ["Comment", [e.canal === "outlook" ? "Outlook" : "courriel", e.boite, e.appelant].filter(Boolean).join(" · ")],
                  ["À qui", adresses(e.destinataires).join("\n") || "—"]];
  if (copie.length) lignes.push(["En copie", copie.join("\n")]);
  lignes.push(["Pièces jointes", String(e.pieces || 0)]);
  if (e.raison) lignes.push(["Raison", e.raison]);
  for (const [mot, valeur] of lignes) {
    const dd = el("dd", mot === "À qui" || mot === "En copie" ? "ev-a" : null, valeur);
    dl.append(el("dt", null, mot), dd);
  }
  const apercu = el("section", "fi-s");
  apercu.append(el("h3", null, "Aperçu du texte"), el("p", null, e.apercu || "—"));
  ouvrirPanneau("envoi", [titre, tete, dl, apercu], depuis);
}

demarrer(async () => {
  if (!moi.onglet_envois) {
    poser([el("h1", null, "Courriels envoyés"), vueVide("Onglet réservé",
      "Cet onglet est réservé à l'administrateur du portail.")], true);
    return;
  }
  await suivre([SOURCE_ENVOIS], (d, premier) => poser(vueEnvois(d[0]), premier));
});
