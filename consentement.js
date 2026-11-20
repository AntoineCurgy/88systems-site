/* Consentement et chargement des traceurs du site 88systems.io (PCP077).
   Rien ne part vers un traceur avant un accord : sans accord, Google Tag Manager n'est meme pas charge
   (mode de consentement de base). L'accord se donne par finalite (mesure d'audience, publicite),
   se retire aussi simplement qu'il se donne, et se redemande apres 182 jours.
   Configuration : window.MESURE_88S = { gtm: "GTM-XXXXXXX" } avant ce script ; sans identifiant valide,
   ni bandeau ni lien du pied : il n'y a rien a consentir.
   Les balises (Analytics, Clarity, pixel Meta, Google Ads) vivent dans le conteneur Tag Manager,
   chacune liee a l'etat du consentement qu'elle exige (analytics_storage ou ad_storage). */
(function () {
  "use strict";
  var CLE = "88s-consentement";
  var VERSION = 1;
  var DUREE_JOURS = 182;
  var config = window.MESURE_88S || {};
  var charge = false;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function lire() {
    try {
      var v = JSON.parse(window.localStorage.getItem(CLE));
      if (!v || v.version !== VERSION) return null;
      if (Date.now() - v.le > DUREE_JOURS * 86400000) return null;
      return v;
    } catch (e) { return null; }
  }

  function ecrire(mesure, publicite) {
    var v = { version: VERSION, mesure: !!mesure, publicite: !!publicite, le: Date.now() };
    try { window.localStorage.setItem(CLE, JSON.stringify(v)); } catch (e) { /* stockage refuse : le choix vaut pour la page */ }
    return v;
  }

  function etats(v) {
    return {
      analytics_storage: v.mesure ? "granted" : "denied",
      ad_storage: v.publicite ? "granted" : "denied",
      ad_user_data: v.publicite ? "granted" : "denied",
      ad_personalization: v.publicite ? "granted" : "denied"
    };
  }

  function charger(v) {
    if (charge || !configure()) return;
    if (!v.mesure && !v.publicite) return;
    charge = true;
    gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("consent", "update", etats(v));
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(config.gtm);
    document.head.appendChild(s);
  }

  function bouton(texte, action) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "consentement-bouton";
    b.textContent = texte;
    b.addEventListener("click", action);
    return b;
  }

  function case_(id, libelle, detail, coche) {
    var l = document.createElement("label");
    l.className = "consentement-case";
    var c = document.createElement("input");
    c.type = "checkbox"; c.id = id; c.checked = !!coche;
    var t = document.createElement("span");
    var f = document.createElement("strong"); f.textContent = libelle;
    t.appendChild(f); t.appendChild(document.createTextNode(" " + detail));
    l.appendChild(c); l.appendChild(t);
    return l;
  }

  function choisir(mesure, publicite) {
    var avant = lire();
    var v = ecrire(mesure, publicite);
    fermer();
    var retrait = charge && avant && ((avant.mesure && !mesure) || (avant.publicite && !publicite));
    if (retrait) {
      /* Clarity exige d'etre prevenu d'un retrait pour effacer ses cookies (documentation Microsoft, lue le 2026-11-20) */
      if (typeof window.clarity === "function") {
        window.clarity("consentv2", { analytics_Storage: mesure ? "granted" : "denied", ad_Storage: publicite ? "granted" : "denied" });
      }
      window.location.reload();   /* un traceur deja charge ne se decharge pas : on recharge sans lui */
      return;
    }
    if (charge) { gtag("consent", "update", etats(v)); }
    charger(v);
  }

  function fermer() {
    var b = document.getElementById("consentement");
    if (b) b.parentNode.removeChild(b);
  }

  function ouvrir() {
    fermer();
    var v = lire();
    var b = document.createElement("div");
    b.id = "consentement";
    b.setAttribute("role", "dialog");
    b.setAttribute("aria-labelledby", "consentement-titre");
    var boite = document.createElement("div");
    boite.className = "consentement-boite";
    var h = document.createElement("p");
    h.id = "consentement-titre"; h.className = "consentement-titre";
    h.textContent = "Vos choix sur ce site";
    var p = document.createElement("p");
    p.textContent = "Avec votre accord, nous mesurons la fréquentation de ce site et l'efficacité de nos annonces (Google, Microsoft Clarity, Meta). Sans accord, rien n'est déposé ni envoyé. Vous pouvez changer d'avis à tout moment, par le lien « Vos choix sur ce site » en bas de page.";
    var details = document.createElement("div");
    details.className = "consentement-details";
    details.hidden = true;
    details.appendChild(case_("consentement-mesure", "Mesure d'audience.", "Les pages lues, jusqu'où, et d'où viennent les visiteurs.", v && v.mesure));
    details.appendChild(case_("consentement-publicite", "Publicité.", "Savoir quelles annonces amènent des visiteurs, et les montrer à des personnes proches.", v && v.publicite));
    var actions = document.createElement("div");
    actions.className = "consentement-actions";
    var bChoisir = bouton("Choisir", function () {
      if (details.hidden) { details.hidden = false; bChoisir.textContent = "Enregistrer mes choix"; return; }
      choisir(document.getElementById("consentement-mesure").checked, document.getElementById("consentement-publicite").checked);
    });
    actions.appendChild(bouton("Tout refuser", function () { choisir(false, false); }));
    actions.appendChild(bChoisir);
    actions.appendChild(bouton("Tout accepter", function () { choisir(true, true); }));
    boite.appendChild(h); boite.appendChild(p); boite.appendChild(details); boite.appendChild(actions);
    b.appendChild(boite);
    document.body.appendChild(b);
  }

  window.consentement88s = { ouvrir: ouvrir, etat: lire };

  function configure() { return !!config.gtm && /^GTM-[A-Z0-9]+$/.test(config.gtm); }

  function demarrer() {
    var liens = document.querySelectorAll("[data-consentement]");
    for (var i = 0; i < liens.length; i++) {
      if (!configure()) { liens[i].hidden = true; continue; }
      liens[i].addEventListener("click", function (e) { e.preventDefault(); ouvrir(); });
    }
    if (!configure()) return;
    var v = lire();
    if (v) charger(v); else ouvrir();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();
})();
