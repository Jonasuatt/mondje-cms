// Les deux langues du site mondje.ci et de l'espace équipe : français (par défaut) et anglais.
//
// Le français reste la langue d'écriture des pages. En anglais, ce script traduit ce que la page AFFICHE (textes, placeholders, titres,
// description) à partir du dictionnaire `en-site.js` ; un texte qu'il ne connaît pas reste tel quel (nom d'un commerce, d'un produit,
// chiffre, texte d'une version plus récente) : jamais d'erreur, jamais de texte perdu. Comme la page peut se redessiner à tout moment
// (l'espace équipe écrit ses écrans en JavaScript), un observateur traduit aussi ce qui apparaît après coup.
//
// Le choix de langue : ?lang=en ou ?lang=fr dans l'adresse, sinon le dernier choix de ce navigateur, sinon le français.
// Une page peut rester en français (pages juridiques non encore relues par le juriste) avec <html data-fr-seulement>.
//
// À charger en premier dans la page : <script src="langue.js"></script> (chemin relatif à la page).

(function () {
  'use strict';

  var CLE = 'mondje_langue';
  var racine = document.documentElement;

  // Le site gère lui-même ses deux langues : le navigateur ne doit pas retraduire la page (Chrome en français retraduirait l'anglais en français).
  racine.setAttribute('translate', 'no');
  var nt = document.createElement('meta');
  nt.name = 'google'; nt.content = 'notranslate';
  document.head.appendChild(nt);

  // 1. La langue --------------------------------------------------------------------------------------------------------
  var demandee = null;
  try {
    var m = /[?&]lang=(fr|en)\b/.exec(location.search);
    if (m) { demandee = m[1]; try { localStorage.setItem(CLE, demandee); } catch (e) { /* navigation privée */ } }
    if (!demandee) { try { demandee = localStorage.getItem(CLE); } catch (e) { demandee = null; } }
  } catch (e) { demandee = null; }
  var frSeulement = racine.hasAttribute('data-fr-seulement');
  // Sans choix fait, la langue du navigateur décide (anglais pour un téléphone en anglais, français sinon).
  if (!demandee) {
    try { demandee = /^en/i.test(navigator.language || '') ? 'en' : 'fr'; } catch (e) { demandee = 'fr'; }
  }
  var LANGUE = demandee === 'en' ? 'en' : 'fr';
  // Une page qui a sa propre version anglaise (ex. « Mon Djê dans votre pays ») y renvoie.
  var pageEn = racine.getAttribute('data-page-en');
  if (pageEn && LANGUE === 'en') { location.replace(pageEn + location.search.replace(/[?&]lang=(fr|en)&?/, '')); return; }
  window.MONDJE_LANGUE = LANGUE;
  window.MONDJE_LOCALE = LANGUE === 'en' ? 'en-GB' : 'fr-FR';

  // 2. Le sélecteur FR | EN ---------------------------------------------------------------------------------------------
  function choisir(l) {
    try { localStorage.setItem(CLE, l); } catch (e) { /* pas grave */ }
    var url = location.href.replace(/([?&])lang=(fr|en)&?/, '$1').replace(/[?&]$/, '');
    if (url === location.href) location.reload(); else location.href = url;
  }

  function installerSelecteur() {
    if (document.getElementById('langue-selecteur')) return;
    var style = document.createElement('style');
    style.textContent =
      '#langue-selecteur{position:fixed;bottom:12px;left:12px;z-index:9999;display:flex;border-radius:999px;overflow:hidden;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.35);font:600 13px system-ui,sans-serif;background:#0e1b2e}' +
      '#langue-selecteur button{border:0;background:transparent;color:#cfd8e6;padding:7px 12px;cursor:pointer;font:inherit}' +
      '#langue-selecteur button.actif{background:#f5a623;color:#0e1b2e}' +
      '#langue-note{position:fixed;bottom:52px;left:12px;z-index:9999;max-width:260px;background:#fff3b0;color:#5c4400;' +
      'border-radius:10px;padding:8px 10px;font:13px system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.25)}';
    document.head.appendChild(style);
    var bloc = document.createElement('div');
    bloc.id = 'langue-selecteur';
    bloc.setAttribute('translate', 'no');
    [['fr', 'FR'], ['en', 'EN']].forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = p[1];
      b.setAttribute('aria-label', p[0] === 'fr' ? 'Français' : 'English');
      if (p[0] === LANGUE) b.className = 'actif';
      b.addEventListener('click', function () { if (p[0] !== LANGUE) choisir(p[0]); });
      bloc.appendChild(b);
    });
    document.body.appendChild(bloc);
    if (frSeulement && LANGUE === 'en') {
      var note = document.createElement('div');
      note.id = 'langue-note';
      note.textContent = 'This page is available in French only for now: legal texts are translated once a lawyer has reviewed them.';
      document.body.appendChild(note);
    }
  }

  function pret(f) {
    if (document.body) f(); else document.addEventListener('DOMContentLoaded', f);
  }
  pret(installerSelecteur);

  racine.lang = frSeulement ? 'fr' : LANGUE;
  if (LANGUE !== 'en' || frSeulement) return;

  // 3. Le dictionnaire (la page se traduit dès qu'il est arrivé) -------------------------------------------------
  var base = '';
  try { base = document.currentScript.src.replace(/[^\/]*$/, ''); } catch (e) { base = ''; }
  var dico = document.createElement('script');
  dico.src = base + 'en-site.js';
  dico.onload = function () { pret(demarrer); };
  document.head.appendChild(dico);

  // 4. Le traducteur -----------------------------------------------------------------------------------------------------
  var EXACTS = null, FRAGMENTS = null;

  function preparer() {
    if (EXACTS) return true;
    var D = window.MONDJE_EN;
    if (!D) return false;
    EXACTS = {}; FRAGMENTS = [];
    Object.keys(D).forEach(function (cle) {
      EXACTS[cle] = D[cle];
      if (cle.length >= 8) FRAGMENTS.push(cle);
    });
    FRAGMENTS.sort(function (a, b) { return b.length - a.length; });
    return true;
  }

  var DEBUTS = ' \n.:;·—–(…!?\'"«»,/-';
  var CACHE = {};

  function traduireTexte(brut) {
    var s = brut.replace(/\s+/g, ' ').trim();
    if (s.length < 2) return brut;
    var connu = CACHE[s];
    if (connu === undefined) {
      if (Object.prototype.hasOwnProperty.call(EXACTS, s)) connu = EXACTS[s];
      else {
        // un texte composé (« Reçue le 12/10 ») : on cherche, mot à mot, le plus long morceau connu
        var pos = 0, sortie = '', trouve = false;
        while (pos < s.length) {
          if (pos === 0 || DEBUTS.indexOf(s.charAt(pos - 1)) >= 0 || DEBUTS.indexOf(s.charAt(pos)) >= 0) {
            var reste = s.slice(pos), pris = null;
            for (var i = 0; i < FRAGMENTS.length; i++) {
              if (reste.indexOf(FRAGMENTS[i]) === 0) { pris = FRAGMENTS[i]; break; }
            }
            if (pris) { sortie += EXACTS[pris]; pos += pris.length; trouve = true; continue; }
          }
          sortie += s.charAt(pos); pos++;
        }
        connu = trouve ? sortie : s;
      }
      CACHE[s] = connu;
    }
    connu = connu.replace(/“ /g, '“').replace(/ ”/g, '”');   // « Chez Awa » -> “Chez Awa”
    if (connu === s) return brut;
    var tete = /^\s*/.exec(brut)[0], queue = /\s*$/.exec(brut)[0];
    return tete + connu + queue;
  }

  var SANS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
  var ATTRIBUTS = ['placeholder', 'title', 'alt', 'aria-label'];
  var faits = typeof WeakMap === 'function' ? new WeakMap() : null;

  function exclu(el) {
    for (var e = el; e && e.nodeType === 1 && e !== racine; e = e.parentNode) {   // la page entière est marquée translate=no (pour le navigateur) : on s'arrête avant
      if (SANS[e.nodeName]) return true;
      if (e.getAttribute && (e.getAttribute('translate') === 'no' || e.hasAttribute('data-no-trad'))) return true;
      if (e.isContentEditable) return true;
    }
    return false;
  }

  function texte(noeud) {
    var v = noeud.nodeValue;
    if (!v || !/[A-Za-zÀ-ÿ]{2}/.test(v)) return;
    if (faits && faits.get(noeud) === v) return;           // déjà traduit par nous, tel quel
    if (noeud.parentNode && exclu(noeud.parentNode)) return;
    var t = traduireTexte(v);
    if (t !== v) { noeud.nodeValue = t; if (faits) faits.set(noeud, t); }
  }

  function attributs(el) {
    if (exclu(el)) return;
    for (var i = 0; i < ATTRIBUTS.length; i++) {
      var v = el.getAttribute(ATTRIBUTS[i]);
      if (v) { var t = traduireTexte(v); if (t !== v) el.setAttribute(ATTRIBUTS[i], t); }
    }
    if (el.nodeName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type || '')) {
      var val = el.getAttribute('value');
      if (val) { var tv = traduireTexte(val); if (tv !== val) el.setAttribute('value', tv); }
    }
  }

  function parcourir(noeud) {
    if (noeud.nodeType === 3) return texte(noeud);
    if (noeud.nodeType !== 1 || exclu(noeud)) return;
    attributs(noeud);
    for (var c = noeud.firstChild; c; c = c.nextSibling) parcourir(c);
  }

  function metas() {
    var t = traduireTexte(document.title);
    if (t !== document.title) document.title = t;
    var ms = document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[property="og:title"]');
    for (var i = 0; i < ms.length; i++) {
      var v = ms[i].getAttribute('content');
      if (v) { var tm = traduireTexte(v); if (tm !== v) ms[i].setAttribute('content', tm); }
    }
  }

  function demarrer() {
    if (!preparer()) return;            // dictionnaire absent : la page reste en français
    parcourir(document.body);
    metas();
    new MutationObserver(function (lots) {
      for (var i = 0; i < lots.length; i++) {
        var l = lots[i];
        if (l.type === 'childList') {
          for (var j = 0; j < l.addedNodes.length; j++) parcourir(l.addedNodes[j]);
        } else if (l.type === 'characterData') {
          texte(l.target);
        } else if (l.type === 'attributes' && l.target.nodeType === 1) {
          attributs(l.target);
        }
      }
    }).observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRIBUTS.concat(['value']),
    });
  }

})();
