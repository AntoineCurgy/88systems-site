// La page d'accueil : le tableau de bord. Le reste vit dans commun.js.
// L'accueil en miroir (Antoine, 2026-11-12, DEC_00892, maquette 2A) : deux cartes jumelles, les automatisations a gauche
// et les agents IA a droite, chacune son anneau ; la grille des points montre les deux, sous le titre « Statut des
// automatisations et agents IA » ; ni « rapports du jour » (cd3c861), ni phrase de pied, ni « Comment lire l'état ».
// Sous la grille, la carte des flux (DEC_00981), a la place de la rangee des systemes.
"use strict";

function jumeau(lien, anneau, sur, titre, sous) {
  const c = el("a", "ke ac-j");
  c.href = lien;
  const t = el("div", "ke-t");
  t.append(el("p", "ac-sur", sur), el("p", "ke-titre", titre), el("p", "ke-s", sous));
  c.append(anneau, t);
  return c;
}

function anneau(classe, fort, total) {
  const a = el("div", "ke-anneau" + (classe ? " " + classe : ""));
  a.setAttribute("aria-hidden", "true");
  const centre = el("span");
  centre.append(el("strong", null, fort), "/" + total);
  a.append(centre);
  return a;
}

function carteAutos(autos) {
  const n = compter(autos);
  const total = autos.length;
  const pct = total ? Math.round(n.ok / total * 100) : 0;
  const a = anneau("", n.ok, total);
  a.style.setProperty("--p", String(pct));
  return jumeau("automatisations.html", a, "Automatisations", pct + " % des automatisations fonctionnent",
    `${n.ok} fonctionnelle${n.ok > 1 ? "s" : ""} sur ${total} · ${n.panne} interrompue${n.panne > 1 ? "s" : ""} · ${n.construction} en construction`);
}

// l'anneau des agents : la part de chaque etape (en service, en recette, en essai)
function carteAgents(agents) {
  const k = (e) => agents.filter((a) => a.etape === e).length;
  const t = agents.length || 1;
  const a = anneau("ag-anneau", k(1), agents.length);
  a.style.setProperty("--s", String(Math.round(k(3) / t * 100)));
  a.style.setProperty("--r", String(Math.round((k(3) + k(2)) / t * 100)));
  a.style.setProperty("--e", String(Math.round((k(3) + k(2) + k(1)) / t * 100)));
  const titre = agents.length ? pluriel(k(1), "agent IA en essai", "agents IA en essai") : "Aucun agent IA publié";
  return jumeau("agents.html", a, "Agents IA", titre, `${k(3)} en service · ${k(2)} en recette · ${k(1)} en essai` + (k(4) ? ` · ${k(4)} arrêté${k(4) > 1 ? "s" : ""}` : ""));
}

function caseAuto(a) {
  const st = statutDe(a);
  const li = el("li");
  const lien = el("a", "case " + st);
  lien.href = "automatisations.html?" + new URLSearchParams({ id: String(a.id) });
  const quand = a.fige ? ` · ${FIGE}` : a.dernier ? ` · ${jourCourt(a.dernier.date)} à ${heureCourte(a.dernier.heure)}` : "";
  lien.title = `${flux(a.flux)} · ${a.nom} · ${STATUTS[st]}${quand}`;
  const pt = el("span", "pt");
  pt.setAttribute("aria-hidden", "true");
  const num = el("span", null, a.court || String(a.id).slice(-2));
  num.setAttribute("aria-hidden", "true");
  lien.append(pt, num, el("span", "sr", `${a.court || a.id} · ${a.nom} · ${flux(a.flux)} : ${STATUTS[st]}`));
  li.append(lien);
  return li;
}

// un point d'agent, a la forme des points des automatisations, en violet ; un agent arrete en gris. RGI_02036 (depot
// d'Antoine du 2026-11-24 a 11h02 : « les IA, notés auj 02, 03... doivent s'appeler IA02, IA03, ... et il faut enlever
// les carrés autour ») : « IA » devant le numero, sans cadre
function caseAgent(a) {
  const st = statutAg(a);
  const li = el("li");
  const lien = el("a", "case " + st + " ag-case" + (a.etape === 4 ? " ia-arrete" : ""));
  lien.href = "agents.html?" + new URLSearchParams({ id: a.id });
  lien.title = `Agent IA · ${a.nom} · ${etapeAg(a)} · banc ${bancAg(a)}`;
  const pt = el("span", "pt");
  pt.setAttribute("aria-hidden", "true");
  const num = el("span", null, "IA" + a.court);
  num.setAttribute("aria-hidden", "true");
  lien.append(pt, num, el("span", "sr", `Agent IA ${a.court} · ${a.nom} : ${etapeAg(a)}`));
  li.append(lien);
  return li;
}

// ---------------------------------------------------------------- la carte des flux (DEC_00981, RGI_01823)
// Antoine, 2026-11-14, a PCP049-1114-a : « je veux exactement cette version » (la pieuvre, a la place de la rangee des
// systemes, nommee « Carte des flux »). Chaque systeme une seule fois, chaque liaison une seule fois ; sa couleur est
// celle des points (statutSysteme : rouge si une automatisation est interrompue, vert si une fonctionne, gris sinon).
// Elle lit /api/automatisations, comme le reste de l'accueil, et se met a jour avec lui.
const SVG_NS = "http://www.w3.org/2000/svg";
const CF_L = 960, CF_H = 420;
const CF_COUL = { ok: "var(--vert)", panne: "var(--rouge)", construction: "var(--pale)" };
// le reglage du client, pose a la publication depuis sa fiche (cle « carte_flux ») : les systemes que la carte ne montre
// pas, et celui qu'elle met au centre (Antoine, 2026-11-22, pour CDP : Outlook et Google Sheets masques, Yardi au centre)
const CARTE_FLUX = {"masquer": ["Outlook", "Google Sheets"], "centre": "Yardi"};
const CF_MASQUES = new Set(CARTE_FLUX.masquer || []);

function sv(tag, attrs, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, String(v));
  if (parent) parent.append(e);
  return e;
}

// les systemes (une fois), les liaisons (une fois par paire) et les automatisations que chacun porte ; une
// automatisation « Tous systemes » n'est pas une liaison : elle se compte a part
function grapheFlux(autosD) {
  const noeuds = new Map(), liens = new Map(), globaux = [];
  const noeud = (s) => { if (!noeuds.has(s)) noeuds.set(s, { nom: s, autos: [], voisins: new Set() }); return noeuds.get(s); };
  for (const s of autosD.systemes || []) if (!CF_MASQUES.has(s)) noeud(s);
  for (const a of autosD.automatisations) {
    const f = a.flux || "";
    if (f.toLowerCase().startsWith("tous")) { globaux.push(a); continue; }
    // un systeme masque n'a ni boite ni liaison ; l'automatisation reste sur ses autres systemes
    const tousSys = Array.isArray(a.systemes) ? a.systemes : [];
    const sys = tousSys.filter((s) => !CF_MASQUES.has(s));
    sys.forEach((s) => noeud(s).autos.push(a));
    if (sys.length < 2 || sys.length < tousSys.length) continue;
    const [x, y] = sys;
    const cle = [x, y].sort().join("|");
    if (!liens.has(cle)) liens.set(cle, { a: x, b: y, autos: [], dirige: new Set(), controle: false });
    const l = liens.get(cle);
    l.autos.push(a);
    if (f.includes("<>")) l.controle = true; else l.dirige.add(x + ">" + y);
    noeud(x).voisins.add(y); noeud(y).voisins.add(x);
  }
  for (const l of liens.values()) l.statut = statutSysteme(l.autos);
  for (const n of noeuds.values()) n.statut = n.autos.length ? statutSysteme(n.autos) : "construction";
  return { noeuds: [...noeuds.values()], liens: [...liens.values()], globaux };
}

const cfLargeur = (n) => Math.round(n.nom.length * (n.grand ? 8.6 : 7.8) + (n.grand ? 44 : 38));
const cfHauteur = (n) => n.grand ? 38 : 30;

// le point ou une liaison sort de la boite d'un systeme, vers (vx, vy) : la fleche se voit au bord
function cfBord(n, vx, vy) {
  const dx = vx - n.x, dy = vy - n.y, w = cfLargeur(n) / 2 + 3, h = cfHauteur(n) / 2 + 3;
  const k = Math.min(dx ? w / Math.abs(dx) : Infinity, dy ? h / Math.abs(dy) : Infinity, 1);
  return { x: n.x + dx * k, y: n.y + dy * k };
}

// un ordre ou les voisins se suivent sur la couronne, pour croiser moins
function cfOrdre(noeuds) {
  const reste = [...noeuds].sort((p, q) => q.voisins.size - p.voisins.size || p.nom.localeCompare(q.nom));
  const ordre = reste.length ? [reste.shift()] : [];
  while (reste.length) {
    const i = Math.max(0, reste.findIndex((n) => ordre[ordre.length - 1].voisins.has(n.nom)));
    ordre.push(reste.splice(i, 1)[0]);
  }
  return ordre;
}

// la pieuvre : au centre le systeme que la fiche du client nomme, sinon le plus relie ; les autres en couronne ; ses bras droits, les autres courbes
function cfPlacer(g) {
  const centre = g.noeuds.find((n) => n.nom === CARTE_FLUX.centre)
    || [...g.noeuds].sort((p, q) => q.voisins.size - p.voisins.size || p.nom.localeCompare(q.nom))[0];
  const autres = cfOrdre(g.noeuds.filter((n) => n !== centre));
  if (centre) Object.assign(centre, { x: CF_L / 2, y: CF_H / 2, grand: true });
  autres.forEach((n, i) => {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / autres.length;
    Object.assign(n, { x: CF_L / 2 + 390 * Math.cos(t), y: CF_H / 2 + 165 * Math.sin(t), grand: false });
  });
  return centre;
}

function cfChemin(A, B, droit) {
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  const c = droit ? null : { x: mx + (CF_L / 2 - mx) * 0.55, y: my + (CF_H / 2 - my) * 0.55 };
  const a = cfBord(A, (c || B).x, (c || B).y), b = cfBord(B, (c || A).x, (c || A).y);
  return c ? `M${a.x},${a.y} C${c.x},${c.y} ${c.x},${c.y} ${b.x},${b.y}` : `M${a.x},${a.y} L${b.x},${b.y}`;
}

// le detail de l'element choisi : ses automatisations, chacune vers sa ligne, et ses agents IA, chacun vers sa fiche
// (RGI_02035) ; pour un systeme, le lien vers ses automatisations, que le clic ouvrait avant
function cfDetail(titre, autos, cible, agents = [], lienListe = "") {
  const ul = el("ul", "cf-dl");
  for (const a of agents) {
    const lien = el("a", "cf-ia");
    lien.href = "agents.html?" + new URLSearchParams({ id: String(a.id) });
    const pt = el("span", "pt");
    pt.setAttribute("aria-hidden", "true");
    lien.append(pt, el("span", "cf-num", "IA" + a.court), el("span", null, a.nom), el("span", "cf-fl", etapeAg(a)));
    const li = el("li");
    li.append(lien);
    ul.append(li);
  }
  for (const a of [...autos].sort(parId)) {
    const lien = el("a");
    lien.href = "automatisations.html?" + new URLSearchParams({ id: String(a.id) });
    lien.append(pastille(statutDe(a)), el("span", "cf-num", a.court || a.id), el("span", null, a.nom), el("span", "cf-fl", flux(a.flux)));
    const li = el("li");
    li.append(lien);
    ul.append(li);
  }
  cible.replaceChildren(el("p", "cf-dt", titre), ul);
  if (lienListe) {
    const tout = el("a", "cf-tout", "Voir dans Automatisations");
    tout.href = lienListe;
    cible.append(tout);
  }
}

const CF_AIDE = "Cliquez sur un élément de la carte pour voir ses automatisations et agents IA.";

// ---------------------------------------------------------------- les agents IA sur la carte (DEC_01462, RGI_02018)
// Le halo lumineux 2B de la fiche v2 (Antoine a PCP049-1123-t) : la place de chaque agent se lit dans sa fiche publiee
// (champ « place » : {type: "systeme", systeme} ou {type: "toutes"}) ; un agent sans place, ou dont le systeme n'est pas
// sur la carte, n'y est pas dessine. RGI_02027 (depot d'Antoine du 2026-11-24 a 00h10 : « on va enlever les lignes
// violettes, ca pollue trop et on enleve "ia arrêté" sur la carte […] laisser les petits numéros violets, mais uniquement
// au niveau des systemes, pas sur les flux […] on laisse les halo ») : un agent arrete, ou place sur un flux, n'est pas
// sur la carte ; l'agent d'un flux y revient quand sa fiche le place sur un systeme.
function iaPlace(a) {
  const p = a && a.place;
  if (!p || typeof p !== "object" || a.etape === 4) return null;
  if (p.type === "systeme" && typeof p.systeme === "string") return { type: "systeme", sys: p.systeme };
  if (p.type === "toutes") return { type: "toutes" };
  return null;
}

function iaTitre(a) { return `Agent IA ${a.court} · ${a.nom} · ${etapeAg(a)}`; }

function iaPilule(g, x, y, texte, titre) {
  const w = 8 + texte.length * 6.2, s = sv("g", {}, g);
  sv("rect", { x: x - w / 2, y: y - 8, width: w, height: 16, rx: 8, class: "ia-pil" }, s);
  sv("text", { x, y: y + 3.4, class: "ia-pil-t" }, s).textContent = texte;
  sv("title", {}, s).textContent = titre;
}

// la lueur sous tout, les pilules au-dessus de tout
function iaDessin(svg, parNom, agents, choisir) {
  const fond = sv("g", { class: "ia-fond" }), haut = sv("g", { class: "ia-agents" }), parSys = new Map();
  for (const a of agents) {
    const p = iaPlace(a);
    if (!p) continue;
    if (p.type === "systeme" && parNom.has(p.sys)) {
      if (!parSys.has(p.sys)) parSys.set(p.sys, []);
      parSys.get(p.sys).push(a);
    }
  }
  for (const [s, liste] of parSys) {
    const n = parNom.get(s), w = cfLargeur(n), h = cfHauteur(n);
    sv("rect", { x: n.x - w / 2 - 9, y: n.y - h / 2 - 9, width: w + 18, height: h + 18, rx: h / 2 + 9, class: "ia-lueur" }, fond);
    iaPilule(haut, n.x, n.y + h / 2 + 15, liste.map((a) => "IA" + a.court).join(" · "), liste.map(iaTitre).join("\n"));
    if (choisir) choisir(haut.lastElementChild, n.montrer);   // RGI_02035 : la pilule violette choisit son systeme
  }
  svg.insertBefore(fond, svg.children[1]);   // apres les definitions, sous les liaisons
  svg.append(haut);
}

function cfDessin(g, detail, agents) {
  const centre = cfPlacer(g);
  const svg = sv("svg", { viewBox: `0 0 ${CF_L} ${CF_H}`, role: "img", "aria-label": "Les systèmes et leurs échanges, avec leur statut" });
  const defs = sv("defs", {}, svg);
  for (const [s, c] of Object.entries(CF_COUL)) {
    const m = sv("marker", { id: "cf-" + s, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    sv("path", { d: "M0,1 L9,5 L0,9 z", style: `fill:${c}` }, m);
  }
  const parNom = new Map(g.noeuds.map((n) => [n.nom, n]));
  const couchL = sv("g", {}, svg), couchN = sv("g", {}, svg);
  // RGI_02035 (depot d'Antoine du 2026-11-24 a 11h02 : « quand on survole sur la carte ca ne fait rien, il faut cliquer
  // sur un élément pour que ca s'affiche à droite, et quand on clique dans le vide, ca annule la sélection ») : le
  // survol ne change rien ; un clic choisit, un clic dans le vide ou Echap rend la carte et l'aide
  const focus = (els) => {
    svg.classList.toggle("focus", Boolean(els));
    svg.querySelectorAll(".on").forEach((e) => e.classList.remove("on"));
    (els || []).forEach((e) => e.classList.add("on"));
  };
  const annuler = () => { focus(null); detail.replaceChildren(el("p", "cf-aide", CF_AIDE)); };
  const choisir = (cible, f) => {
    cible.setAttribute("tabindex", "0");
    cible.setAttribute("role", "button");
    cible.addEventListener("click", (e) => { e.stopPropagation(); f(); });
    cible.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } });
  };
  svg.addEventListener("click", annuler);
  svg.addEventListener("keydown", (e) => { if (e.key === "Escape") annuler(); });
  const agentsDe = (nom) => (agents || []).filter((x) => { const p = iaPlace(x); return p && p.type === "systeme" && p.sys === nom; });
  for (const l of g.liens) {
    const A = parNom.get(l.a), B = parNom.get(l.b);
    const dir = l.dirige.size === 1 && !l.controle ? [...l.dirige][0] : null;
    const [D, F] = dir && dir.startsWith(l.b + ">") ? [B, A] : [A, B];
    const seul = l.controle && !l.dirige.size;
    const d = cfChemin(D, F, D === centre || F === centre);
    const p = sv("path", { d, class: "cf-e" + (seul ? " ctl" : ""), style: `stroke:${CF_COUL[l.statut]};stroke-width:${Math.min(1.6 + l.autos.length * 0.7, 7)}` }, couchL);
    if (dir) p.setAttribute("marker-end", `url(#cf-${l.statut})`);
    const zone = sv("path", { d, class: "cf-z" }, couchL);
    const titre = `${D.nom} ${seul ? "↔" : dir ? "→" : "⇄"} ${F.nom} · ${pluriel(l.autos.length, "automatisation", "automatisations")}`;
    sv("title", {}, zone).textContent = titre;
    l.el = p;
    choisir(zone, () => { focus([p, A.el, B.el]); cfDetail(titre, l.autos, detail); });
  }
  for (const n of g.noeuds) {
    const w = cfLargeur(n), h = cfHauteur(n);
    const a = sv("g", { class: "cf-n" }, couchN);
    sv("rect", { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: h / 2, style: `stroke:${CF_COUL[n.statut]}` }, a);
    sv("circle", { cx: n.x - w / 2 + 14, cy: n.y, r: 4, style: `fill:${CF_COUL[n.statut]}` }, a);
    sv("text", { x: n.x + 8, y: n.y + 4.5, "text-anchor": "middle", class: n.grand ? "g" : "" }, a).textContent = n.nom;
    sv("title", {}, a).textContent = `${n.nom} · ${pluriel(n.autos.length, "automatisation", "automatisations")}`;
    n.el = a;
    n.montrer = () => {
      const liens = g.liens.filter((l) => l.a === n.nom || l.b === n.nom);
      const ags = agentsDe(n.nom);
      focus([a, ...liens.map((l) => l.el), ...[...n.voisins].map((v) => parNom.get(v).el)]);
      cfDetail(`${n.nom} · ${pluriel(n.autos.length, "automatisation", "automatisations")}` +
        (ags.length ? ` · ${pluriel(ags.length, "agent IA", "agents IA")}` : ""), n.autos, detail, ags,
        "automatisations.html?" + new URLSearchParams({ sys: n.nom }));
    };
    choisir(a, n.montrer);
  }
  if (agents && agents.length) iaDessin(svg, parNom, agents, choisir);
  return svg;
}

function carteDesFlux(autosD, agents) {
  const g = grapheFlux(autosD);
  const sec = el("section", "carte cf");
  sec.setAttribute("aria-labelledby", "titre-cf");
  const ch = el("div", "c-h");
  const h2 = el("h2", null, "Carte des flux");
  h2.id = "titre-cf";
  const leg = el("p", "legende");
  for (const [s, texte] of [["ok", "fonctionnel"], ["panne", "interrompu"], ["construction", "en construction"]]) {
    const x = el("span");
    x.append(pastille(s), texte);
    leg.append(x);
  }
  for (const [c, texte] of [["", "flux"], [" ctl", "contrôle"]]) {
    const x = el("span", "cf-lg");
    x.append(el("i", "cf-tr" + c), texte);
    leg.append(x);
  }
  const places = (agents || []).map(iaPlace);
  if (places.some(Boolean)) {
    const x = el("span", "cf-lg");
    x.append(el("i", "ia-lg-i"), "agent IA");
    leg.append(x);
  }
  ch.append(h2, leg);
  if (!g.noeuds.length) {
    sec.append(ch, el("p", "cf-sous", "Aucun système n'est encore relié par une automatisation."));
    return sec;
  }
  // RGI_02035 : plus de phrase sous le titre (depot d'Antoine du 2026-11-24 a 11h02 : « Supprime cette phrase »)
  const detail = el("div", "cf-d");
  detail.append(el("p", "cf-aide", CF_AIDE));
  const corps = el("div", "cf-corps");
  corps.append(cfDessin(g, detail, agents), detail);
  sec.append(ch, corps);
  return sec;
}

function vueAccueil([autosD, rapsD, agD]) {
  majBandeau(rapsD.maj || autosD.maj);
  const autos = autosD.automatisations;
  const agents = agD.agents.filter((a) => a.etape > 0);

  const deux = el("div", "ac-deux");
  deux.append(carteAutos(autos), carteAgents(agents));

  const etat = el("section", "carte");
  etat.setAttribute("aria-labelledby", "titre-etat");
  const ch = el("div", "c-h");
  const h2 = el("h2", null, "Statut des automatisations et agents IA");
  h2.id = "titre-etat";
  const leg = el("p", "legende");
  for (const [s, texte] of [["ok", "fonctionnelle"], ["panne", "interrompue"], ["construction", "en construction"]]) {
    const x = el("span");
    x.append(pastille(s), texte);
    leg.append(x);
  }
  ch.append(h2, leg);
  const grille = el("ul", "grille");
  grille.append(...[...autos].sort(parId).map(caseAuto), ...agents.map(caseAgent));
  etat.append(ch, grille);

  // la carte des flux remplace la rangee des systemes (DEC_00981) : chaque systeme n'y est qu'une fois, et un clic sur
  // lui ouvre ses automatisations, comme la carte qu'il remplace
  return [el("h1", null, "Tableau de bord"), deux, etat, carteDesFlux(autosD, agents)];
}

demarrer(() => suivre([SOURCES.autos, SOURCES.rapports, SOURCES.agents], (d, premier) => poser(vueAccueil(d), premier)));
