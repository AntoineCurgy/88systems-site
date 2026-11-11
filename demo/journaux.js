// L'onglet « Journaux » (Antoine, 2026-11-11, DEC_00817 : « je préfère A, mais visible par tous, filtré par gouvernance
// par accès aux automatisations / rapports bien sur ») : la forme A de la planche du 2026-11-10, le fil des passages des
// sept derniers jours groupe par jour, sur le modele de l'onglet Emails ; la barre segmentee et la recherche, le detail
// dans la fenetre centree. L'API ne rend que les automatisations ou « Gouvernance » donne un droit a la personne.
"use strict";

const SOURCE_JOURNAUX = { chemin: "/api/journaux", verifier: (d) => Array.isArray(d.passages) };
const RESULTAT = { ok: ["Réussi", "t-vert"], "écarts": ["Écarts trouvés", "t-ferme"], alerte: ["Alerte", "t-ambre"],
                   "à voir": ["À voir", "t-ambre"], "échec": ["Échec", "t-rouge"] };
const GROUPES_JOURNAUX = [["", "Tous", () => true], ["echec", "Échecs", (p) => p.resultat === "échec"],
                          ["alerte", "Alertes", (p) => p.resultat === "alerte"], ["ecarts", "Écarts", (p) => p.resultat === "écarts"]];
const filtresJournaux = { g: "", q: "" };

const tagPassage = (r) => { const [mot, c] = RESULTAT[r] || [r, "t-ferme"]; return el("span", "tag " + c, mot); };
function jourLisibleJ(iso) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  const t = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const duree = (s) => {
  if (s === "" || s == null || Number.isNaN(Number(s))) return "—";
  const n = Math.round(Number(s));
  return n < 60 ? `${n} s` : `${Math.floor(n / 60)} min ${String(n % 60).padStart(2, "0")}`;
};

// « Description », jamais « Ce qui s'est passé » (Antoine, 2026-11-11, DEC_00832)
function ouvrirPassage(p, d, depuis) {
  const titre = el("h2", null, p.nom);
  titre.id = "panneau-titre";
  const tete = el("p", "rt-tete");
  tete.append(tagPassage(p.resultat), " ", el("span", "mono discret", p.id));
  const dl = el("dl", "rt-dl");
  for (const [mot, v] of [["Quand", `${jourLisibleJ(p.date)}, ${(p.heure || "").slice(0, 5)}`], ["Durée", duree(p.duree)],
                          ["Description", p.detail || "—"], ["Version du code", p.version || "—"], ["Machine", p.machine || "—"]])
    dl.append(el("dt", null, mot), el("dd", null, v));
  const enfants = [titre, tete, dl];
  const inc = (d.incidents || []).filter((i) => i.id === p.id);
  if (inc.length) {
    const s = el("section", "fi-s");
    s.append(el("h3", null, inc.length > 1 ? "Incidents ouverts" : "Incident ouvert"));
    for (const i of inc) s.append(el("p", null, `${(i.ouvert || "").slice(0, 16).replace(" ", " à ")} · ${i.texte}`));
    enfants.push(s);
  }
  ouvrirPanneau("envoi", enfants, depuis);
}

function vue(d) {
  const titre = el("h1", null, "Journaux");
  const passages = d.passages;
  if (!passages.length) {
    const vide = el("div", "carte vide");
    vide.append(el("p", null, "Aucun passage de vos automatisations ces sept derniers jours."));
    const tete = el("div", "tete-fixe");
    tete.append(titre);
    return [figerTete(tete), vide];
  }
  const barre = el("div", "gb-barre");
  for (const [v, texte, garde] of GROUPES_JOURNAUX) {
    const b = bouton("gb-o", texte);
    b.append(" ", el("span", null, passages.filter(garde).length));
    b.dataset.v = v;
    b.addEventListener("click", () => { filtresJournaux.g = v; filtrer(); });
    barre.append(b);
  }
  const lab = el("label", "cherche");
  lab.append(el("span", "sr", "Rechercher dans les journaux"));
  const champ = el("input");
  champ.type = "search";
  champ.placeholder = "Rechercher une automatisation, un message…";
  champ.value = filtresJournaux.q;
  champ.addEventListener("input", () => { filtresJournaux.q = champ.value.trim().toLowerCase(); filtrer(); });
  lab.append(champ);
  const outils = el("div", "outils ligne rt-outils");
  outils.append(barre, el("span", "rt-sp"), lab);   // la recherche a droite, comme les onglets Retours et Emails

  const carte = el("div", "carte gd-c");
  const table = el("table", "gd ev");
  const cg = el("colgroup");
  for (const w of ["6rem", "17rem", "10rem", "6rem", ""]) { const c = el("col"); if (w) c.style.width = w; cg.append(c); }
  const thead = el("thead");
  const tr = el("tr");
  for (const t of ["Heure", "Automatisation", "Résultat", "Durée", "Description"]) tr.append(el("th", null, t));
  thead.append(tr);
  table.append(cg, thead);
  const groupes = [];
  for (const jour of [...new Set(passages.map((p) => p.date))]) {
    const du = passages.filter((p) => p.date === jour);
    const tb = el("tbody");
    const bande = el("tr", "gd-b");
    const th = el("th", null, jourLisibleJ(jour));
    th.colSpan = 5;
    const cpt = el("span", "g-cpt", du.length);
    th.append(" ", cpt);
    bande.append(th);
    tb.append(bande);
    const lignes = du.map((p) => {
      const l = el("tr", "rt-l");
      const r = el("td");
      r.append(tagPassage(p.resultat));
      const a = el("td", "rt-o");
      a.append(el("span", "mono discret", p.id.replace("AUT_", "") + " "), p.nom);
      const det = el("td", "discret", p.detail);
      det.style.whiteSpace = "nowrap"; det.style.overflow = "hidden"; det.style.textOverflow = "ellipsis";
      l.append(el("td", "mono gd-date", (p.heure || "").slice(0, 5)), a, r, el("td", "mono", duree(p.duree)), det);
      l.tabIndex = 0;
      const ouvrir = (ev) => { ev.stopPropagation(); ouvrirPassage(p, d, l); };
      l.addEventListener("click", ouvrir);
      l.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ouvrir(ev); } });
      tb.append(l);
      return [l, p];
    });
    table.append(tb);
    groupes.push([tb, cpt, lignes]);
  }
  carte.append(table);
  function filtrer() {
    for (const b of barre.children) b.setAttribute("aria-pressed", String(b.dataset.v === filtresJournaux.g));
    const garde = GROUPES_JOURNAUX.find((g) => g[0] === filtresJournaux.g)[2];
    for (const [tb, cpt, lignes] of groupes) {
      let n = 0;
      for (const [l, p] of lignes) {
        const ok = garde(p) && (!filtresJournaux.q || `${p.id} ${p.nom} ${p.detail}`.toLowerCase().includes(filtresJournaux.q));
        l.hidden = !ok; n += ok;
      }
      tb.hidden = !n; cpt.textContent = n;
    }
  }
  filtrer();
  const tete = el("div", "tete-fixe");
  tete.append(titre, outils);
  return [figerTete(tete), carte];
}

demarrer(async () => { await suivre([SOURCE_JOURNAUX], (d, premier) => poser(vue(d[0]), premier)); });
