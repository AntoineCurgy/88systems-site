// La page d'accueil : le tableau de bord. Le reste vit dans commun.js.
// L'accueil en miroir (Antoine, 2026-11-12, DEC_00892, maquette 2A) : deux cartes jumelles, les automatisations a gauche
// et les agents IA a droite, chacune son anneau ; la grille des points montre les deux, sous le titre « Statut des
// automatisations et agents IA » ; ni « rapports du jour » (cd3c861), ni phrase de pied, ni « Comment lire l'état ».
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
  return jumeau("agents.html", a, "Agents IA", titre, `${k(3)} en service · ${k(2)} en recette · ${k(1)} en essai`);
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

// un point d'agent, a la forme des points des automatisations : « IA » et son numero court, le point de son etape
function caseAgent(a) {
  const st = statutAg(a);
  const li = el("li");
  const lien = el("a", "case " + st + " ag-case");
  lien.href = "agents.html?" + new URLSearchParams({ id: a.id });
  lien.title = `Agent IA · ${a.nom} · ${etapeAg(a)} · banc ${bancAg(a)}`;
  const pt = el("span", "pt");
  pt.setAttribute("aria-hidden", "true");
  const num = el("span", null, "IA " + a.court);
  num.setAttribute("aria-hidden", "true");
  lien.append(pt, num, el("span", "sr", `Agent IA ${a.court} · ${a.nom} : ${etapeAg(a)}`));
  li.append(lien);
  return li;
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

  const systemes = cartesSystemes(autosD, (s) => {
    const a = el("a");
    a.href = s ? "automatisations.html?" + new URLSearchParams({ sys: s }) : "automatisations.html";
    return a;
  });
  return [el("h1", null, "Tableau de bord"), deux, etat, systemes];
}

demarrer(() => suivre([SOURCES.autos, SOURCES.rapports, SOURCES.agents], (d, premier) => poser(vueAccueil(d), premier)));
