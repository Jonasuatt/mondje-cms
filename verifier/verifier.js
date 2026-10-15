// Vérifier un relevé d'activité : l'institution tape le code reçu du commerçant, la base répond (fonction publique verifier_releve).
// Rien n'est écrit dans la page avec innerHTML : le nom du commerce est saisi par le commerçant, il doit rester du texte.
(function () {
  'use strict';
  var URL_API = 'https://xflrfpmsatikglixxtxs.supabase.co/rest/v1/rpc/verifier_releve';
  var CLE = 'sb_publishable__o--lkXqrhp8MvCruh5aCA_AoBSlLLB';
  var champ = document.getElementById('code');
  var sortie = document.getElementById('resultat');

  var nombre = new Intl.NumberFormat('fr-FR');
  function fcfa(n) { return nombre.format(n || 0).replace(/ | /g, ' ') + ' F'; }
  function jour(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Abidjan' }); }
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function libelleMois(m) { var p = String(m).split('-'); return (MOIS[Number(p[1]) - 1] || m) + ' ' + p[0]; }

  function el(tag, classe, texte) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texte !== undefined) e.textContent = texte;
    return e;
  }
  function carte(titre) {
    var c = el('section', 'carte');
    if (titre) c.appendChild(el('h2', '', titre));
    return c;
  }
  function liste(paires) {
    var dl = el('dl');
    paires.forEach(function (p) { dl.appendChild(el('dt', '', p[0])); dl.appendChild(el('dd', '', p[1])); });
    return dl;
  }

  function message(texte, bon) {
    sortie.textContent = '';
    var c = carte();
    c.appendChild(el('span', 'badge ' + (bon ? 'ok' : 'non'), texte[0]));
    c.appendChild(el('p', '', texte[1]));
    sortie.appendChild(c);
  }

  function afficher(r) {
    if (r.statut === 'inconnu') return message(['Code inconnu', 'Ce code ne correspond à aucun relevé. Vérifiez-le, ou demandez-le de nouveau au commerçant.'], false);
    if (r.statut === 'revoque') return message(['Relevé révoqué', 'Le commerçant a retiré ce relevé. Il ne doit plus être utilisé.'], false);
    if (r.statut === 'expire') return message(['Relevé expiré', 'La durée de validité de ce relevé est dépassée. Demandez au commerçant d’en établir un nouveau.'], false);
    if (r.statut !== 'valide' || !r.contenu) return message(['Réponse inattendue', 'Réessayez dans un instant.'], false);

    var c = r.contenu, v = c.ventes || {}, p = c.periode || {}, f = c.fiabilite || {}, co = c.commerce || {};
    sortie.textContent = '';

    var tete = carte();
    tete.appendChild(el('span', 'badge ok', 'Relevé valide'));
    tete.appendChild(el('p', '', 'Code ' + r.code + ' · établi le ' + jour(r.cree_le) + ' · valable jusqu’au ' + jour(r.expire_le)));
    tete.appendChild(liste([
      ['Commerce', co.nom || ''],
      ['Ville', co.ville || '—'],
      ['Sur Mon Djê depuis', jour(co.sur_mon_dje_depuis)],
      ['Établi pour', r.destinataire || ''],
      ['Période', jour(p.debut) + ' au ' + jour(p.fin) + ' (' + p.mois + ' mois)']
    ]));
    sortie.appendChild(tete);

    var ventes = carte('Ventes enregistrées');
    ventes.appendChild(el('div', 'gros', fcfa(v.total)));
    ventes.appendChild(liste([
      ['Nombre de ventes', nombre.format(v.nombre || 0)],
      ['Panier moyen', fcfa(v.panier_moyen)],
      ['Jours avec des ventes', (v.jours_avec_ventes || 0) + ' sur ' + (p.jours || 0)],
      ['dont espèces', fcfa(v.dont_especes)],
      ['dont Mobile Money', fcfa(v.dont_mobile_money)],
      ['dont à crédit', fcfa(v.dont_a_credit)]
    ]));
    sortie.appendChild(ventes);

    var mois = carte('Mois par mois');
    var t = el('table'), th = el('thead'), tr = el('tr');
    ['Mois', 'Ventes', 'Nombre', 'Jours'].forEach(function (h, i) { tr.appendChild(el('th', i ? 'n' : '', h)); });
    th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    (c.par_mois || []).forEach(function (m) {
      var l = el('tr');
      l.appendChild(el('td', '', libelleMois(m.mois)));
      l.appendChild(el('td', 'n', fcfa(m.ventes)));
      l.appendChild(el('td', 'n', nombre.format(m.nombre || 0)));
      l.appendChild(el('td', 'n', String(m.jours_avec_ventes || 0)));
      tb.appendChild(l);
    });
    t.appendChild(tb); mois.appendChild(t);
    mois.appendChild(el('p', 'petit', 'Le premier et le dernier mois peuvent être partiels.'));
    sortie.appendChild(mois);

    var sorties = carte('Dépenses notées');
    sorties.appendChild(liste([['Total des dépenses de la période', fcfa((c.depenses || {}).total)]]));
    sortie.appendChild(sorties);

    var fiab = carte('Régularité de la saisie');
    fiab.appendChild(liste([
      ['Sessions de caisse fermées', String(f.sessions_de_caisse_fermees || 0)],
      ['Paiements contestés', String(f.paiements_contestes || 0)],
      ['Commandes annulées', String(f.commandes_annulees || 0)]
    ]));
    sortie.appendChild(fiab);

    var av = carte('À lire');
    av.className = 'carte avertissement';
    av.appendChild(el('p', '', c.avertissement || ''));
    av.appendChild(el('p', 'petit', 'Comparez le code et l’empreinte ci-dessous avec ceux du document reçu : s’ils diffèrent, le document a été modifié.'));
    av.appendChild(el('p', 'empreinte', 'Empreinte SHA-256 : ' + (r.empreinte || '')));
    sortie.appendChild(av);
  }

  function verifier(code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return;
    message(['Vérification…', 'Un instant.'], true);
    fetch(URL_API, {
      method: 'POST',
      headers: { apikey: CLE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code })
    }).then(function (rep) { return rep.json(); }).then(afficher)
      .catch(function () { message(['Connexion impossible', 'Vérifiez votre connexion internet et réessayez.'], false); });
  }

  document.getElementById('formulaire').addEventListener('submit', function (e) {
    e.preventDefault();
    verifier(champ.value);
    try { history.replaceState(null, '', '?c=' + encodeURIComponent(champ.value.trim().toUpperCase())); } catch (x) { /* adresse non modifiable : sans importance */ }
  });

  var depuis = new URLSearchParams(location.search).get('c');
  if (depuis) { champ.value = depuis.toUpperCase(); verifier(depuis); }
})();
