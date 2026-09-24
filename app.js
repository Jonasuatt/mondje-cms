// Espace équipe Mon Djê, sur grand écran.
//
// Même base, mêmes règles : ce fichier ne sait rien faire que l'application
// du téléphone ne sache déjà. Ce qu'il apporte, c'est un clavier et un écran
// large — saisir trois cents produits au pouce n'était pas raisonnable.
//
// Aucune chaîne de compilation : trois fichiers, ouverts tels quels par le
// navigateur. Les droits sont ceux du serveur ; masquer un bouton ici
// n'interdit rien, c'est la base qui décide.

const URL_SUPABASE = 'https://xflrfpmsatikglixxtxs.supabase.co';
const CLE_PUBLIQUE = 'sb_publishable__o--lkXqrhp8MvCruh5aCA_AoBSlLLB';

const bd = supabase.createClient(URL_SUPABASE, CLE_PUBLIQUE);

// --- Petits outils ---------------------------------------------------------

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Tout ce qui vient de la base est saisi par des humains : jamais dans le HTML
// sans passer par ici.
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fcfa = (n) => String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F';
const jour = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');
const quand = (iso) => new Date(iso).toLocaleString('fr-FR',
  { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const TYPE_COMMERCE = {
  restauration: 'Restauration (tables)',
  vente_directe: 'Vente directe',
};

const ACTIVITES = {
  bar_maquis: 'Bar / Maquis', restaurant: 'Restaurant', boutique: 'Boutique',
};

const MODES = {
  especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo', moov_money: 'Moov Money', virement: 'Virement',
  offert: 'Mois offert',
};

const ETATS = {
  a_jour: ['À jour', 'ok'],
  echeance_proche: ['Échéance proche', 'accent'],
  expire: ['Expiré', 'danger'],
  jamais_paye: ['Jamais payé', 'danger'],
  suspendu: ['Suspendu', 'danger'],
};

const ACTIONS = {
  commerce_ouvert: 'Commerce ouvert',
  commerce_suspendu: 'Commerce suspendu',
  commerce_reactive: 'Commerce rouvert',
  formule_changee: 'Formule changée',
  abonnement_encaisse: 'Abonnement encaissé',
  reinitialisation_code: 'Code secret réinitialisé',
  stock_charge: 'Stock chargé par Mon Djê',
  admin_cree: 'Compte d’équipe créé',
  admin_desactive: 'Accès d’un administrateur bloqué',
  admin_reactive: 'Accès d’un administrateur rendu',
};

const etiquette = (etat) => {
  const [libelle, couleur] = ETATS[etat] ?? [etat, 'accent'];
  return `<span class="etiquette ${couleur}">${esc(libelle)}</span>`;
};

const barre = (part) =>
  `<div class="barre"><span style="width:${Math.max(2, Math.min(100, Math.round(part * 100)))}%"></span></div>`;

function echoue(e) {
  console.error(e);
  alert(e?.message ?? 'Opération impossible. Vérifie ta connexion.');
}

// Les fonctions serveur répondent leur motif en français dans le corps ; la
// bibliothèque Supabase, elle, ne remonte que « non-2xx status code ». Sans
// cette lecture, un refus devient une énigme.
async function appelerFonction(nom, corps) {
  const { data, error } = await bd.functions.invoke(nom, { body: corps });
  if (!error) return data;
  const detail = await error.context?.json?.().catch(() => null);
  throw new Error(detail?.erreur ?? error.message ?? 'Erreur du serveur');
}

// --- Fiches ----------------------------------------------------------------
//
// Une fiche prend toute la page, comme dans l'application du téléphone : on
// traite un dossier, on ne le lit pas dans un coin pendant que la liste
// continue de réclamer l'attention. « Retour » ramène à la liste.

function ouvrirPanneau(titre, html) {
  $('#titrePage').textContent = titre;
  $('#actionsPage').innerHTML = '<button class="bouton sombre" id="retourListe">Retour</button>';
  $('#page').innerHTML = html;
  $('#retourListe').addEventListener('click', () => aller(pageCourante));
  window.scrollTo(0, 0);
}

// --- Session ---------------------------------------------------------------

let moi = null;   // { user, nom, role }

// Toujours la même main derrière le même clavier : l'adresse revient d'une
// fois sur l'autre. Le mot de passe, lui, ne reste jamais nulle part.
const ADRESSE_RETENUE = 'mondje_adresse';
$('#email').value = localStorage.getItem(ADRESSE_RETENUE) ?? '';
if ($('#email').value) $('#motDePasse').focus();

$('#formConnexion').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#erreurConnexion').textContent = '';
  const adresse = $('#email').value.trim();
  const { error } = await bd.auth.signInWithPassword({
    email: adresse,
    password: $('#motDePasse').value,
  });
  if (error) {
    $('#erreurConnexion').textContent = 'Adresse ou mot de passe incorrect.';
    return;
  }
  localStorage.setItem(ADRESSE_RETENUE, adresse);
  demarrer();
});

$('#deconnexion').addEventListener('click', async () => {
  await bd.auth.signOut();
  location.reload();
});

async function demarrer() {
  const { data: { user } } = await bd.auth.getUser();
  if (!user) return;

  // Un commerçant qui tomberait sur cette adresse n'y a rien à faire : la
  // base ne lui rendra aucune ligne, autant le lui dire tout de suite.
  const { data } = await bd.from('admin_plateforme')
    .select('nom, role, actif').eq('user_id', user.id).maybeSingle();
  if (!data || !data.actif) {
    $('#erreurConnexion').textContent =
      "Ce compte n'appartient pas à l'équipe Mon Djê. Les commerçants travaillent depuis l'application.";
    await bd.auth.signOut();
    return;
  }

  moi = { user, nom: data.nom, role: data.role };
  $('#connexion').classList.add('cache');
  $('#app').classList.remove('cache');
  $('#moi').innerHTML =
    `${esc(data.nom ?? user.email)}<br>${data.role === 'super_admin' ? 'Super administrateur' : 'Administrateur'}`;
  construireMenu();
  aller('accueil');
}

// --- Navigation ------------------------------------------------------------

const PAGES = {
  accueil: { titre: 'Tableau de bord', rendre: pageAccueil },
  dossiers: { titre: 'Demandes d’ouverture', rendre: pageDossiers },
  commerces: { titre: 'Commerces', rendre: pageCommerces },
  abonnements: { titre: 'Abonnements', rendre: pageAbonnements },
  catalogue: { titre: 'Catalogue', rendre: pageCatalogue },
  propositions: { titre: 'Produits proposés', rendre: pagePropositions },
  messages: { titre: 'Messages', rendre: pageMessages },
  journal: { titre: 'Journal des interventions', rendre: pageJournal },
  equipe: { titre: 'Équipe et formules', rendre: pageEquipe },
};

let pageCourante = 'accueil';

function construireMenu() {
  $('#nav').innerHTML = Object.entries(PAGES).map(([cle, p]) =>
    `<button class="onglet" data-page="${cle}">
       <span>${esc(p.titre)}</span><span class="pastille cache" data-pastille="${cle}"></span>
     </button>`).join('');
  $$('#nav .onglet').forEach((b) =>
    b.addEventListener('click', () => aller(b.dataset.page)));
}

async function aller(cle) {
  pageCourante = cle;
  $$('#nav .onglet').forEach((b) => b.classList.toggle('actif', b.dataset.page === cle));
  $('#titrePage').textContent = PAGES[cle].titre;
  $('#actionsPage').innerHTML = '';
  $('#page').innerHTML = '<p class="info">Chargement…</p>';
  try {
    await PAGES[cle].rendre();
  } catch (e) {
    echoue(e);
    $('#page').innerHTML = '<p class="erreur">Chargement impossible.</p>';
  }
  rafraichirPastilles();
}

// Ce qui attend quelqu'un : demandes, produits proposés, messages non lus.
async function rafraichirPastilles() {
  const [d, p, m] = await Promise.all([
    bd.from('demande_ouverture').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    bd.from('proposition_produit').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    bd.from('message').select('id', { count: 'exact', head: true }).eq('de_l_equipe', false).is('lu_le', null),
  ]);
  const poser = (cle, n) => {
    const e = $(`[data-pastille="${cle}"]`);
    if (!e) return;
    e.textContent = n;
    e.classList.toggle('cache', !n);
  };
  poser('dossiers', d.count ?? 0);
  poser('propositions', p.count ?? 0);
  poser('messages', m.count ?? 0);
}

// --- Tableau de bord -------------------------------------------------------

async function pageAccueil() {
  const [etats, recettes, commerces] = await Promise.all([
    bd.from('abonnement_etat').select('*').order('nom'),
    bd.from('abonnement_recette').select('*').order('mois', { ascending: false }).limit(6),
    bd.from('structure').select('id, nom, ville, type_commerce, actif'),
  ]);
  const lignes = etats.data ?? [];
  const ouverts = (commerces.data ?? []).filter((c) => c.actif);
  const aRelancer = lignes.filter((l) => l.etat === 'expire' || l.etat === 'jamais_paye');
  const attendu = lignes.filter((l) => l.actif).reduce((n, l) => n + (l.prix_mensuel ?? 0), 0);
  const moisCourant = new Date().toISOString().slice(0, 7);
  const recetteDuMois = (recettes.data ?? []).find((r) => r.mois === moisCourant)?.total ?? 0;

  const parType = compter(ouverts, (c) => TYPE_COMMERCE[c.type_commerce] ?? c.type_commerce);
  const parVille = compter(ouverts, (c) => (c.ville ?? 'Ville non renseignée').trim());
  const sommetType = parType[0]?.[1] ?? 1;
  const sommetVille = parVille[0]?.[1] ?? 1;

  $('#page').innerHTML = `
    <div class="grille">
      <div class="carte">
        <div class="info">Commerces ouverts</div>
        <div class="gros">${ouverts.length}</div>
      </div>
      <div class="carte">
        <div class="info">Attendu par mois</div>
        <div class="gros">${fcfa(attendu)}</div>
      </div>
      <div class="carte ${recetteDuMois ? 'ok' : ''}">
        <div class="info">Encaissé ce mois-ci</div>
        <div class="gros">${fcfa(recetteDuMois)}</div>
      </div>
      <div class="carte ${aRelancer.length ? 'danger' : ''}">
        <div class="info">À relancer</div>
        <div class="gros">${aRelancer.length}</div>
        <div class="info">expiré ou jamais payé</div>
      </div>
    </div>

    <h2 style="margin-top:24px">Par secteur d'activité</h2>
    ${parType.map(([nom, n]) => `
      <div class="carte">
        <div class="rangee"><span class="nom">${esc(nom)}</span><span class="nom">${n}</span></div>
        <div style="margin-top:8px">${barre(n / sommetType)}</div>
      </div>`).join('') || '<p class="info">Aucun commerce ouvert.</p>'}

    <h2 style="margin-top:24px">Par ville</h2>
    ${parVille.map(([nom, n]) => `
      <div class="carte">
        <div class="rangee"><span class="nom">${esc(nom)}</span><span class="nom">${n}</span></div>
        <div style="margin-top:8px">${barre(n / sommetVille)}</div>
      </div>`).join('')}

    <h2 style="margin-top:24px">Où sont nos abonnés</h2>
    <div class="carte-ci" id="carteCI">
      <img src="carte-ci.jpg" alt="Carte de la Côte d'Ivoire" />
    </div>

    <h2 style="margin-top:24px">Recette encaissée</h2>
    ${(recettes.data ?? []).map((r) => `
      <div class="carte">
        <div class="rangee">
          <span class="nom">${esc(r.mois)}</span>
          <span class="nom">${fcfa(r.total)}</span>
        </div>
        <div class="info">${r.nb_commerces} commerce(s) · ${r.nb_paiements} versement(s)</div>
      </div>`).join('') || '<p class="info">Aucun versement enregistré.</p>'}`;

  poserPoints(parVille);
}

const compter = (liste, clef) => Object.entries(
  liste.reduce((acc, x) => { const c = clef(x); acc[c] = (acc[c] ?? 0) + 1; return acc; }, {})
).sort((a, b) => b[1] - a[1]);

// Un point par ville sur la carte. Une ville que la carte ne connaît pas reste
// comptée dans la liste de gauche : aucun abonné ne disparaît.
function poserPoints(parVille) {
  const zone = $('#carteCI');
  if (!zone) return;
  for (const [ville, n] of parVille) {
    const place = trouverVille(ville);
    if (!place) continue;
    const point = document.createElement('div');
    point.className = 'point';
    point.style.left = `${place.x * 100}%`;
    point.style.top = `${place.y * 100}%`;
    point.textContent = n;
    point.title = `${ville} : ${n} commerce(s)`;
    zone.appendChild(point);
  }
}

// --- Demandes d'ouverture --------------------------------------------------

async function pageDossiers() {
  const { data } = await bd.from('demande_ouverture').select('*')
    .order('cree_le', { ascending: false }).limit(200);
  const demandes = data ?? [];

  $('#page').innerHTML = tableau(
    ['Commerce', 'Type', 'Ville', 'Propriétaire', 'Reçue le', 'État'],
    demandes.map((d) => ({
      id: d.id,
      cellules: [
        esc(d.nom_commerce),
        esc(TYPE_COMMERCE[d.type_commerce] ?? d.type_commerce),
        esc(d.commune ? `${d.ville} — ${d.commune}` : d.ville),
        `${esc(d.nom_proprietaire)}<div class="info">${esc(d.telephone)}</div>`,
        jour(d.cree_le),
        d.statut === 'en_attente' ? '<span class="etiquette accent">En attente</span>'
          : d.statut === 'acceptee' ? '<span class="etiquette ok">Acceptée</span>'
          : '<span class="etiquette danger">Refusée</span>',
      ],
    })),
    'Aucune demande.'
  );

  brancherLignes((id) => ficheDemande(demandes.find((d) => d.id === id)));
}

function ficheDemande(d) {
  const enAttente = d.statut === 'en_attente';
  ouvrirPanneau(d.nom_commerce, `
    ${champLecture('Type', TYPE_COMMERCE[d.type_commerce] ?? d.type_commerce)}
    ${champLecture('Ville', d.commune ? `${d.ville} — ${d.commune}` : d.ville)}
    ${champLecture('Propriétaire', d.nom_proprietaire)}
    ${champLecture('WhatsApp', d.telephone)}
    ${champLecture('E-mail', d.email)}
    ${champLecture('Message', d.message)}
    ${champLecture('Conditions acceptées', `version ${d.cgu_version}, le ${jour(d.cree_le)}`)}
    ${d.motif_refus ? champLecture('Motif du refus', d.motif_refus) : ''}
    ${enAttente ? `
      <div class="carte accent">
        <p class="info">
          Accepter crée le commerce et le compte du propriétaire. Les
          identifiants ne s'affichent qu'une fois : garde l'écran ouvert le
          temps de les envoyer sur son WhatsApp.
        </p>
        <button class="bouton ok" id="accepter">Accepter et créer le commerce</button>
      </div>
      <label>Motif du refus
        <input id="motif" placeholder="Ex : commerce déjà inscrit" />
      </label>
      <button class="bouton danger" id="refuser">Refuser la demande</button>
    ` : ''}
  `);

  if (!enAttente) return;

  $('#accepter').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const { data, error } = await bd.functions.invoke('creer-commerce', {
        body: { demande_id: d.id },
      });
      if (error) throw error;
      ouvrirPanneau('Identifiants du propriétaire', `
        <div class="carte ok">
          ${champLecture('Code commerce', data.code_commerce)}
          ${champLecture('N° d’employé', data.code_employe)}
          ${champLecture('Code secret', data.code_secret)}
        </div>
        <p class="erreur">
          Ce code ne sera plus jamais affiché. Envoie-le maintenant sur le
          WhatsApp du propriétaire (${esc(d.telephone)}).
        </p>
        <button class="bouton" id="copier">Copier le message</button>
      `);
      const message =
        `${d.nom_proprietaire}, voici tes identifiants Mon Djê pour « ${d.nom_commerce} » :\n\n` +
        `• Code commerce : ${data.code_commerce}\n` +
        `• N° d'employé : ${data.code_employe}\n` +
        `• Code secret : ${data.code_secret}\n\n` +
        `Change ce code dès ta première connexion (Profil → Changer mon code).`;
      $('#copier').addEventListener('click', () => {
        navigator.clipboard.writeText(message);
        $('#copier').textContent = 'Message copié';
      });
    } catch (err) {
      echoue(err);
      e.target.disabled = false;
    }
  });

  $('#refuser').addEventListener('click', async (e) => {
    const motif = $('#motif').value.trim();
    if (motif.length < 3) return alert('Indique un motif : le commerçant le lira.');
    e.target.disabled = true;
    const { error } = await bd.from('demande_ouverture')
      .update({ statut: 'refusee', motif_refus: motif }).eq('id', d.id);
    if (error) { echoue(error); e.target.disabled = false; return; }
    aller('dossiers');
  });
}

// --- Commerces -------------------------------------------------------------

// Depuis que l'acceptation des conditions garde son auteur, deux chemins
// relient structure et membre. Il faut donc nommer celui qu'on veut, sinon
// PostgREST refuse la jointure.
//
// Et le refus se lisait nulle part : l'erreur était jetée à la poubelle, la
// liste s'affichait vide, et on cherchait une panne de données. Une requête
// qui échoue doit le dire.
async function pageCommerces() {
  const { data, error } = await bd.from('structure')
    .select('id, nom, code, type_commerce, ville, commune, telephone, telephone_fixe, actif, formule, abonnement_actif_jusquau, cree_le, membre!membre_structure_id_fkey(id, nom, code_employe, roles, actif)')
    .order('nom');
  if (error) throw error;
  const commerces = data ?? [];

  $('#page').innerHTML = tableau(
    ['Commerce', 'Code', 'Type', 'Ville', 'Comptes', 'État'],
    commerces.map((c) => ({
      id: c.id,
      cellules: [
        `${esc(c.nom)}<div class="info">${esc(c.membre.find((m) => m.roles.includes('proprietaire') && m.actif)?.nom ?? '')}</div>`,
        `<code>${esc(c.code)}</code>`,
        esc(TYPE_COMMERCE[c.type_commerce] ?? c.type_commerce),
        esc(c.ville ?? '—'),
        c.membre.filter((m) => m.actif).length,
        c.actif ? '<span class="etiquette ok">Ouvert</span>' : '<span class="etiquette danger">Suspendu</span>',
      ],
    })),
    'Aucun commerce.'
  );

  brancherLignes((id) => ficheCommerce(commerces.find((c) => c.id === id)));
}

async function ficheCommerce(c) {
  const [etat, formules, paiements, interventions] = await Promise.all([
    bd.from('abonnement_etat').select('*').eq('structure_id', c.id).maybeSingle(),
    bd.from('formule_abonnement').select('*').eq('actif', true).order('rang'),
    bd.from('abonnement_paiement').select('*').eq('structure_id', c.id)
      .order('cree_le', { ascending: false }).limit(12),
    bd.from('journal_lisible').select('*').eq('structure_id', c.id)
      .order('cree_le', { ascending: false }).limit(30),
  ]);
  const e = etat.data;

  ouvrirPanneau(c.nom, `
    <div class="carte ${c.actif ? '' : 'danger'}">
      ${champLecture('Code commerce', c.code)}
      ${champLecture('Type', TYPE_COMMERCE[c.type_commerce] ?? c.type_commerce)}
      ${champLecture('Ville', c.commune ? `${c.ville} — ${c.commune}` : c.ville)}
      ${champLecture('WhatsApp', c.telephone)}
      ${champLecture('Téléphone fixe', c.telephone_fixe)}
      ${champLecture('Ouvert le', jour(c.cree_le))}
    </div>

    <h3>Comptes</h3>
    <p class="info">
      Mon Djê ne garde aucun code secret : c'est ce qui permet au commerçant de
      dire « seule ma caissière a pu saisir cette vente ». Quand quelqu'un perd
      le sien, on en tire un nouveau — l'ancien meurt aussitôt.
    </p>
    ${c.membre.slice().sort((a, b) => a.code_employe - b.code_employe).map((m) => `
      <div class="carte" style="${m.actif ? '' : 'opacity:.5'}">
        <div class="rangee">
          <span class="nom">${String(m.code_employe).padStart(2, '0')} · ${esc(m.nom)}</span>
          <span class="info">${esc(m.roles.join(', '))}${m.actif ? '' : ' · désactivé'}</span>
        </div>
        ${m.actif ? `<button class="bouton sombre petit" data-recoder="${esc(m.id)}"
          data-nom="${esc(m.nom)}" style="margin-top:8px">Nouveau code secret</button>` : ''}
      </div>`).join('')}

    <div class="carte ${e?.cgu_version === CGU_COURANTE ? '' : 'accent'}">
      <div class="info">Conditions d'utilisation</div>
      <div class="nom">${e?.cgu_version
        ? (e.cgu_version === CGU_COURANTE
            ? `À jour · acceptées le ${jour(e.cgu_acceptee_le)}`
            : `Version ${esc(e.cgu_version)} — pas encore la dernière`)
        : 'Jamais acceptées'}</div>
      ${e?.cgu_version === CGU_COURANTE ? '' : `<p class="info">
        Ce commerce n'a pas accepté les articles sur ce que l'équipe peut voir,
        sur nos conseils et sur sa page publique. Le rappel s'affiche sur son
        écran d'accueil ; s'il tarde, appelle-le.
      </p>`}
    </div>

    <h3>Son commerce au jour le jour</h3>
    <button class="bouton sombre" id="voirCarte">Carte et stock</button>
    <button class="bouton sombre" id="voirActivite">Historique de l'activité</button>
    <button class="bouton sombre" id="voirRapport">Rapport</button>
    <p class="info">
      Nous pouvons charger ses produits et son stock à sa demande. Une entrée
      saisie ici porte le nom de Mon Djê, jamais le sien.
    </p>

    <h3>Abonnement</h3>
    <div class="carte">
      <div class="rangee">
        <span class="nom">${esc(e?.formule_libelle ?? 'Sans formule')}</span>
        ${etiquette(e?.etat ?? 'jamais_paye')}
      </div>
      <div class="info">
        ${e?.prix_mensuel != null ? `${fcfa(e.prix_mensuel)} par mois · ` : ''}
        ${e?.jusquau ? `payé jusqu'au ${jour(e.jusquau)}` : 'aucun paiement enregistré'}
      </div>
      <div class="info">Total encaissé : ${fcfa(e?.total_encaisse ?? 0)}</div>
    </div>

    <label>Formule
      <select id="formule">
        ${(formules.data ?? []).map((f) =>
          `<option value="${esc(f.code)}" ${f.code === c.formule ? 'selected' : ''}>
             ${esc(f.libelle)} — ${fcfa(f.prix_mensuel)}/mois
           </option>`).join('')}
      </select>
    </label>

    <div class="ligne-champs">
      <label>Mois payés<input id="mois" type="number" min="1" max="24" value="1" /></label>
      <label>Montant reçu<input id="montant" type="number" min="0" value="${e?.prix_mensuel ?? 0}" /></label>
    </div>
    <label>Moyen de paiement
      <select id="mode">
        ${Object.entries(MODES).filter(([m]) => m !== 'offert')
          .map(([m, l]) => `<option value="${m}">${l}</option>`).join('')}
      </select>
    </label>
    <label>Référence (facultatif)<input id="reference" /></label>
    <button class="bouton ok" id="encaisser">Enregistrer le paiement</button>
    <button class="bouton sombre" id="offrir">Offrir un mois</button>

    <h3 style="margin-top:24px">Versements</h3>
    ${(paiements.data ?? []).map((p) => `
      <div class="carte">
        <div class="rangee">
          <span class="nom">${fcfa(p.montant)}</span>
          <span class="info">${quand(p.cree_le)}</span>
        </div>
        <div class="info">
          ${p.mois} mois · ${esc(MODES[p.mode] ?? p.mode)} · jusqu'au ${jour(p.periode_fin)}
          ${p.reference ? ` · ${esc(p.reference)}` : ''}
        </div>
      </div>`).join('') || '<p class="info">Aucun versement.</p>'}

    <h3 style="margin-top:24px">Historique des interventions</h3>
    ${(interventions.data ?? []).map((l) => `
      <div class="carte">
        <div class="rangee">
          <span class="nom">${esc(ACTIONS[l.action] ?? l.action)}</span>
          <span class="info">${quand(l.cree_le)}</span>
        </div>
        <div class="info">${esc(l.auteur)}${detailJournal(l)}</div>
      </div>`).join('') || '<p class="info">Aucune intervention.</p>'}

    <h3 style="margin-top:24px">Ouverture</h3>
    <button class="bouton ${c.actif ? 'danger' : 'ok'}" id="basculer">
      ${c.actif ? 'Suspendre ce commerce' : 'Rouvrir ce commerce'}
    </button>
    <p class="info">
      ${c.actif
        ? "Suspendre ferme la porte : plus personne ne peut se connecter, mais les ventes, le stock et les factures restent entiers."
        : 'Ce commerce est suspendu : son équipe ne peut pas se connecter.'}
    </p>
  `);

  $('#voirCarte').addEventListener('click', () => ficheCarte(c));
  $('#voirActivite').addEventListener('click', () => ficheActivite(c));
  $('#voirRapport').addEventListener('click', () => ficheRapport(c));

  $$('[data-recoder]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(`${b.dataset.nom} recevra un nouveau code secret, et l'ancien ne marchera plus. `
                 + `L'intervention est enregistrée au journal. Continuer ?`)) return;
    b.disabled = true;
    try {
      const data = await appelerFonction('reinitialiser-code',
        { structure_id: c.id, membre_id: b.dataset.recoder });
      montrerCode(c, data);
    } catch (e) {
      echoue(e);
      b.disabled = false;
    }
  }));

  $('#formule').addEventListener('change', async (ev) => {
    const { error } = await bd.rpc('admin_changer_formule', {
      p_structure: c.id, p_formule: ev.target.value,
    });
    if (error) return echoue(error);
    ficheCommerce({ ...c, formule: ev.target.value });
  });

  $('#encaisser').addEventListener('click', async (ev) => {
    const mois = parseInt($('#mois').value, 10);
    const montant = parseInt($('#montant').value, 10);
    if (!(mois > 0) || !(montant >= 0)) return alert('Indique la durée et le montant.');
    if (!confirm(`Enregistrer ${fcfa(montant)} pour ${mois} mois ?`)) return;
    ev.target.disabled = true;
    const { data, error } = await bd.rpc('admin_enregistrer_paiement', {
      p_structure: c.id, p_mois: mois, p_montant: montant,
      p_mode: $('#mode').value, p_reference: $('#reference').value.trim() || null,
      p_commentaire: null,
    });
    if (error) { echoue(error); ev.target.disabled = false; return; }
    alert(`Abonnement payé jusqu'au ${jour(data)}.`);
    ficheCommerce(c);
  });

  $('#offrir').addEventListener('click', async (ev) => {
    if (!confirm(`Offrir un mois à ${c.nom} ? Le geste est enregistré à 0 F.`)) return;
    ev.target.disabled = true;
    const { data, error } = await bd.rpc('admin_enregistrer_paiement', {
      p_structure: c.id, p_mois: 1, p_montant: 0, p_mode: 'offert',
      p_reference: null, p_commentaire: 'Mois offert',
    });
    if (error) { echoue(error); ev.target.disabled = false; return; }
    alert(`Mois offert : abonnement valable jusqu'au ${jour(data)}.`);
    ficheCommerce(c);
  });

  $('#basculer').addEventListener('click', async (ev) => {
    const suspendre = c.actif;
    if (!confirm(suspendre
      ? `${c.nom} ne pourra plus se connecter. Rien n'est effacé. Confirmer ?`
      : `${c.nom} pourra de nouveau travailler. Confirmer ?`)) return;
    ev.target.disabled = true;
    const { error } = await bd.rpc('admin_basculer_commerce', {
      p_structure: c.id, p_actif: !suspendre,
      p_motif: suspendre ? 'Suspension depuis le CMS' : null,
    });
    if (error) { echoue(error); ev.target.disabled = false; return; }
    aller('commerces');
  });
}

// --- Abonnements -----------------------------------------------------------

async function pageAbonnements() {
  const { data } = await bd.from('abonnement_etat').select('*').order('nom');
  const lignes = data ?? [];

  $('#page').innerHTML = tableau(
    ['Commerce', 'Ville', 'Formule', 'Prix', 'Payé jusqu’au', 'Total encaissé', 'État'],
    lignes.map((l) => ({
      id: l.structure_id,
      cellules: [
        esc(l.nom),
        esc(l.ville ?? '—'),
        esc(l.formule_libelle ?? 'Sans formule'),
        `<span class="n">${fcfa(l.prix_mensuel ?? 0)}</span>`,
        jour(l.jusquau),
        `<span class="n">${fcfa(l.total_encaisse)}</span>`,
        etiquette(l.etat),
      ],
    })),
    'Aucun commerce.'
  );

  brancherLignes(async (id) => {
    const { data: c } = await bd.from('structure')
      .select('id, nom, code, type_commerce, ville, commune, telephone, telephone_fixe, actif, formule, abonnement_actif_jusquau, cree_le, membre!membre_structure_id_fkey(id, nom, code_employe, roles, actif)')
      .eq('id', id).single();
    ficheCommerce(c);
  });
}

// --- Catalogue -------------------------------------------------------------

let rubriques = [];

async function pageCatalogue() {
  if (!rubriques.length) {
    const { data } = await bd.from('categorie_catalogue')
      .select('code, libelle, exemples, famille, sous_famille, rang').order('rang');
    rubriques = data ?? [];
  }

  $('#actionsPage').innerHTML =
    '<button class="bouton" id="nouveau">Ajouter un produit</button>';
  $('#nouveau').addEventListener('click', () => ficheProduit(null));

  $('#page').innerHTML = `
    <div class="carte">
      <div class="ligne-champs">
        <label>Activité
          <select id="filtreActivite">
            <option value="">Toutes</option>
            ${Object.entries(ACTIVITES).map(([c, l]) => `<option value="${c}">${l}</option>`).join('')}
          </select>
        </label>
        <label>Rubrique
          <select id="filtreRubrique">
            <option value="">Toutes</option>
            ${rubriques.map((r) => `<option value="${esc(r.code)}">${esc(r.famille)} — ${esc(r.libelle)}</option>`).join('')}
          </select>
        </label>
      </div>
      <label>Chercher<input id="recherche" placeholder="Nom du produit" /></label>
    </div>
    <div id="liste"></div>`;

  const charger = async () => {
    $('#liste').innerHTML = '<p class="info">Chargement…</p>';
    let q = bd.from('catalogue_produit')
      .select('*, categorie_catalogue (libelle, famille)')
      .eq('actif', true).limit(1000);
    const activite = $('#filtreActivite').value;
    const rubrique = $('#filtreRubrique').value;
    const mot = $('#recherche').value.trim();
    if (activite) q = q.contains('activites', [activite]);
    if (rubrique) q = q.eq('categorie', rubrique);
    if (mot) q = q.ilike('nom', `%${mot}%`);
    const { data, error } = await q;
    if (error) return echoue(error);

    const produits = (data ?? []).sort((a, b) =>
      (a.categorie_catalogue?.famille ?? '').localeCompare(b.categorie_catalogue?.famille ?? '')
      || (a.categorie_catalogue?.libelle ?? '').localeCompare(b.categorie_catalogue?.libelle ?? '')
      || a.nom.localeCompare(b.nom));

    $('#liste').innerHTML =
      `<p class="info">${produits.length} produit(s).</p>` +
      tableau(
        ['Produit', 'Rubrique', 'Unité', 'Conditionnement', 'Proposé à'],
        produits.map((p) => ({
          id: p.id,
          cellules: [
            `${esc(p.nom)}${p.contenance ? ` <span class="info">${esc(p.contenance)}</span>` : ''}`,
            `${esc(p.categorie_catalogue?.libelle ?? p.categorie)}<div class="info">${esc(p.categorie_catalogue?.famille ?? '')}</div>`,
            esc(p.unite),
            p.taille_conditionnement ? `${esc(p.conditionnement)} de ${p.taille_conditionnement}` : '—',
            esc(p.activites.map((a) => ACTIVITES[a] ?? a).join(', ')),
          ],
        })),
        'Aucun produit pour ce filtre.'
      );
    brancherLignes((id) => ficheProduit(produits.find((p) => p.id === id)));
  };

  $('#filtreActivite').addEventListener('change', charger);
  $('#filtreRubrique').addEventListener('change', charger);
  let minuteur;
  $('#recherche').addEventListener('input', () => {
    clearTimeout(minuteur);
    minuteur = setTimeout(charger, 300);
  });
  charger();
}

function ficheProduit(p) {
  ouvrirPanneau(p ? 'Corriger le produit' : 'Nouveau produit', `
    <label>Nom<input id="pNom" value="${esc(p?.nom ?? '')}" placeholder="Ex : Huile de palme" /></label>
    <label>Contenance (facultatif)
      <input id="pContenance" value="${esc(p?.contenance ?? '')}" placeholder="Ex : 1 litre, 65 cl" />
    </label>
    <label>Rubrique
      <select id="pRubrique">
        ${rubriques.map((r) => `
          <option value="${esc(r.code)}" ${r.code === p?.categorie ? 'selected' : ''}>
            ${esc(r.famille)} — ${esc(r.libelle)}
          </option>`).join('')}
      </select>
    </label>
    <div class="ligne-champs">
      <label>Unité de vente
        <select id="pUnite">
          ${['pièce', 'bouteille', 'canette', 'kg', 'litre', 'sachet', 'paquet', 'boîte',
             'assiette', 'bol', 'dose', 'sac', 'tas', 'alvéole', 'pot', 'tablette', 'barre',
             'flacon', 'rouleau', 'tasse', 'brique', 'plaquette', 'bombe', 'ramette', 'coupe']
            .map((u) => `<option ${u === p?.unite ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
      </label>
      <label>Taille du conditionnement
        <input id="pTaille" type="number" min="0" value="${p?.taille_conditionnement ?? ''}" placeholder="12" />
      </label>
    </div>
    <label>Nom du conditionnement
      <input id="pCond" value="${esc(p?.conditionnement ?? '')}" placeholder="casier, carton, sac…" />
    </label>
    <label>Proposé à</label>
    <div class="rangee" style="justify-content:flex-start; gap:16px; margin-bottom:16px">
      ${Object.entries(ACTIVITES).map(([c, l]) => `
        <label style="margin:0">
          <input type="checkbox" class="pActivite" value="${c}" style="width:auto"
            ${(p?.activites ?? ['boutique']).includes(c) ? 'checked' : ''} /> ${l}
        </label>`).join('')}
    </div>
    <button class="bouton ok" id="enregistrer">Enregistrer</button>
    ${p ? '<button class="bouton danger" id="retirer">Retirer du catalogue</button>' : ''}
    <p class="info">
      Le catalogue est commun à tous les commerces et ne porte jamais de prix :
      ils changent d'un quartier à l'autre.
    </p>
  `);

  $('#enregistrer').addEventListener('click', async (ev) => {
    const nom = $('#pNom').value.trim();
    const activites = $$('.pActivite').filter((c) => c.checked).map((c) => c.value);
    if (nom.length < 2) return alert('Il faut un nom.');
    if (!activites.length) return alert('Choisis au moins une activité.');
    const taille = parseInt($('#pTaille').value, 10);
    const ligne = {
      nom,
      contenance: $('#pContenance').value.trim() || null,
      categorie: $('#pRubrique').value,
      unite: $('#pUnite').value,
      conditionnement: taille > 1 ? ($('#pCond').value.trim() || 'lot') : null,
      taille_conditionnement: taille > 1 ? taille : null,
      activites,
    };
    ev.target.disabled = true;
    const { error } = p
      ? await bd.from('catalogue_produit').update(ligne).eq('id', p.id)
      : await bd.from('catalogue_produit').insert(ligne);
    if (error) {
      alert(error.code === '23505'
        ? 'Ce produit existe déjà au catalogue, avec la même contenance.'
        : error.message);
      ev.target.disabled = false;
      return;
    }
    aller('catalogue');
  });

  if (p) {
    $('#retirer').addEventListener('click', async () => {
      if (!confirm(`« ${p.nom} » ne sera plus proposé aux commerces. Ceux qui l'ont déjà le gardent. Confirmer ?`)) return;
      const { error } = await bd.from('catalogue_produit').update({ actif: false }).eq('id', p.id);
      if (error) return echoue(error);
      aller('catalogue');
    });
  }
}

// --- Produits proposés -----------------------------------------------------

async function pagePropositions() {
  if (!rubriques.length) {
    const { data } = await bd.from('categorie_catalogue')
      .select('code, libelle, exemples, famille, sous_famille, rang').order('rang');
    rubriques = data ?? [];
  }
  const { data } = await bd.from('proposition_produit')
    .select('*, structure:structure_id (nom)')
    .eq('statut', 'en_attente').order('cree_le');
  const propositions = data ?? [];

  $('#page').innerHTML = propositions.length ? propositions.map((p) => `
    <div class="carte">
      <div class="rangee">
        <span class="nom">${esc(p.nom)}${p.contenance ? ` ${esc(p.contenance)}` : ''}</span>
        <span class="info">${esc(p.structure?.nom ?? '')} · ${jour(p.cree_le)}</span>
      </div>
      <div class="info">
        ${esc(p.unite)}${p.taille_conditionnement ? ` · ${esc(p.conditionnement)} de ${p.taille_conditionnement}` : ''}
      </div>
      <div class="rangee" style="margin-top:12px; justify-content:flex-start; gap:8px">
        <button class="bouton petit" data-accepter="${p.id}">Ajouter au catalogue</button>
        <button class="bouton petit sombre" data-ecarter="${p.id}">Écarter</button>
      </div>
    </div>`).join('')
    : `<p class="info">
         Aucun produit proposé. Un commerçant en propose un quand il ajoute à sa
         carte un produit absent du catalogue.
       </p>`;

  $$('[data-accepter]').forEach((b) => b.addEventListener('click', () =>
    accepterProposition(propositions.find((p) => p.id === b.dataset.accepter))));

  $$('[data-ecarter]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Le produit reste sur la carte du commerce, mais n’entre pas au catalogue commun. Confirmer ?')) return;
    const { error } = await bd.from('proposition_produit')
      .update({ statut: 'refusee', traitee_par: moi.user.id, traitee_le: new Date().toISOString() })
      .eq('id', b.dataset.ecarter);
    if (error) return echoue(error);
    aller('propositions');
  }));
}

function accepterProposition(p) {
  ouvrirPanneau(`Ajouter « ${p.nom} »`, `
    <p class="info">Proposé par ${esc(p.structure?.nom ?? 'un commerce')}.</p>
    <label>Nom au catalogue<input id="aNom" value="${esc(p.nom)}" /></label>
    <label>Contenance<input id="aContenance" value="${esc(p.contenance ?? '')}" /></label>
    <label>Rubrique
      <select id="aRubrique">
        ${rubriques.map((r) => `
          <option value="${esc(r.code)}" ${r.code === p.categorie ? 'selected' : ''}>
            ${esc(r.famille)} — ${esc(r.libelle)}
          </option>`).join('')}
      </select>
    </label>
    <label>Proposé à</label>
    <div class="rangee" style="justify-content:flex-start; gap:16px; margin-bottom:16px">
      ${Object.entries(ACTIVITES).map(([c, l]) => `
        <label style="margin:0">
          <input type="checkbox" class="aActivite" value="${c}" style="width:auto" /> ${l}
        </label>`).join('')}
    </div>
    <button class="bouton ok" id="valider">Ajouter au catalogue</button>
  `);

  $('#valider').addEventListener('click', async (ev) => {
    const activites = $$('.aActivite').filter((c) => c.checked).map((c) => c.value);
    if (!activites.length) return alert('Choisis au moins une activité.');
    ev.target.disabled = true;
    const { data, error } = await bd.from('catalogue_produit').insert({
      nom: $('#aNom').value.trim(),
      contenance: $('#aContenance').value.trim() || null,
      categorie: $('#aRubrique').value,
      unite: p.unite,
      conditionnement: p.conditionnement,
      taille_conditionnement: p.taille_conditionnement,
      activites,
    }).select('id').single();
    if (error) {
      alert(error.code === '23505' ? 'Ce produit existe déjà au catalogue.' : error.message);
      ev.target.disabled = false;
      return;
    }
    await bd.from('proposition_produit').update({
      statut: 'acceptee', traitee_par: moi.user.id,
      traitee_le: new Date().toISOString(), catalogue_produit_id: data.id,
    }).eq('id', p.id);
    aller('propositions');
  });
}

// --- Messages --------------------------------------------------------------

async function pageMessages() {
  const { data } = await bd.from('message')
    .select('id, structure_id, de_l_equipe, texte, lu_le, cree_le, membre:membre_id (nom), structure:structure_id (nom)')
    .order('cree_le', { ascending: false }).limit(500);
  const messages = data ?? [];

  const fils = new Map();
  for (const m of messages) {
    const f = fils.get(m.structure_id) ?? {
      structure_id: m.structure_id, nom: m.structure?.nom ?? 'Commerce',
      dernier: m, nonLus: 0,
    };
    if (!m.de_l_equipe && !m.lu_le) f.nonLus++;
    fils.set(m.structure_id, f);
  }

  $('#page').innerHTML = [...fils.values()].map((f) => `
    <div class="carte ${f.nonLus ? 'accent' : ''}" data-fil="${f.structure_id}" style="cursor:pointer">
      <div class="rangee">
        <span class="nom">${esc(f.nom)}</span>
        ${f.nonLus
          ? `<span class="etiquette accent">${f.nonLus} non lu(s)</span>`
          : `<span class="info">${quand(f.dernier.cree_le)}</span>`}
      </div>
      <div class="info">${f.dernier.de_l_equipe ? 'Nous : ' : ''}${esc(f.dernier.texte.slice(0, 140))}</div>
    </div>`).join('') || `<p class="info">
      Aucun message. Les commerçants écrivent depuis « Assistance Mon Djê »,
      sur leur tableau de bord.
    </p>`;

  $$('[data-fil]').forEach((c) => c.addEventListener('click', () =>
    ouvrirFil(c.dataset.fil, fils.get(c.dataset.fil).nom)));
}

async function ouvrirFil(structureId, nom) {
  const { data } = await bd.from('message')
    .select('id, de_l_equipe, texte, lu_le, cree_le, membre:membre_id (nom)')
    .eq('structure_id', structureId).order('cree_le').limit(300);
  const fil = data ?? [];

  ouvrirPanneau(nom, `
    <div class="fil" id="fil">
      ${fil.map((m) => `
        <div class="bulle ${m.de_l_equipe ? 'nous' : 'eux'}">
          <div>${esc(m.texte)}</div>
          <div class="info">${m.de_l_equipe ? 'Mon Djê' : esc(m.membre?.nom ?? 'Le commerce')} · ${quand(m.cree_le)}</div>
        </div>`).join('') || '<p class="info">Aucun message.</p>'}
    </div>
    <label style="margin-top:16px">Répondre
      <textarea id="reponse" placeholder="Écrire un message"></textarea>
    </label>
    <button class="bouton ok" id="envoyer">Envoyer</button>
  `);

  $('#fil').scrollTop = $('#fil').scrollHeight;

  // Lu en ouvrant : l'autre côté voit que son message est arrivé.
  const aLire = fil.filter((m) => !m.de_l_equipe && !m.lu_le).map((m) => m.id);
  if (aLire.length) {
    await bd.from('message').update({ lu_le: new Date().toISOString() }).in('id', aLire);
    rafraichirPastilles();
  }

  $('#envoyer').addEventListener('click', async (ev) => {
    const texte = $('#reponse').value.trim();
    if (!texte) return;
    ev.target.disabled = true;
    const { error } = await bd.from('message').insert({
      structure_id: structureId, texte, de_l_equipe: true,
    });
    if (error) { echoue(error); ev.target.disabled = false; return; }
    ouvrirFil(structureId, nom);
  });
}

// --- Journal ---------------------------------------------------------------

function detailJournal(l) {
  const d = l.detail ?? {};
  const bouts = [];
  if (d.montant != null) bouts.push(`${fcfa(d.montant)} pour ${d.mois} mois`);
  if (d.jusquau) bouts.push(`jusqu'au ${jour(d.jusquau)}`);
  if (d.formule) bouts.push(`formule ${d.formule}`);
  if (d.motif) bouts.push(d.motif);
  if (d.nom && d.montant == null) bouts.push(d.nom);
  if (l.membre) bouts.push(l.membre);
  return bouts.length ? ` · ${esc(bouts.join(' · '))}` : '';
}

async function pageJournal() {
  const { data } = await bd.from('journal_lisible').select('*')
    .order('cree_le', { ascending: false }).limit(500);
  const lignes = data ?? [];

  $('#page').innerHTML = `
    <p class="sous">
      Chaque intervention de l'équipe, la plus récente d'abord. Rien ne s'y
      efface : c'est ce qui répond en cas de contrôle.
    </p>` + tableau(
    ['Quand', 'Action', 'Qui', 'Commerce', 'Détail'],
    lignes.map((l) => ({
      cellules: [
        quand(l.cree_le),
        esc(ACTIONS[l.action] ?? l.action),
        `${esc(l.auteur)}${l.auteur_role === 'super_admin' ? '<div class="info">super admin</div>' : ''}`,
        esc(l.commerce ?? '—'),
        detailJournal(l).replace(/^ · /, '') || '—',
      ],
    })),
    'Aucune intervention enregistrée.'
  );
}

// --- Équipe et formules ----------------------------------------------------

async function pageEquipe() {
  const [comptes, formules] = await Promise.all([
    bd.from('admin_plateforme').select('user_id, nom, role, actif, cree_le').order('cree_le'),
    bd.from('formule_abonnement').select('*').order('rang'),
  ]);
  const superAdmin = moi.role === 'super_admin';

  $('#page').innerHTML = `
    <h2>Formules d'abonnement</h2>
    <p class="info">
      Le prix s'applique aux prochains paiements ; ceux déjà encaissés gardent
      leur montant.
    </p>
        ${(formules.data ?? []).map((f) => `
          <div class="carte">
            <div class="rangee">
              <span class="nom">${esc(f.libelle)}</span>
              <span>
                <input type="number" min="0" value="${f.prix_mensuel}"
                  data-prix="${esc(f.code)}" style="width:120px; display:inline-block" />
                <button class="bouton petit" data-enregistrer="${esc(f.code)}">Enregistrer</button>
              </span>
            </div>
            <div class="info">
              ${esc(f.description ?? '')}
              ${f.max_comptes ? ` · jusqu'à ${f.max_comptes} comptes` : ' · comptes sans limite'}
            </div>
          </div>`).join('')}

    <h2 style="margin-top:24px">Comptes de l'équipe</h2>
        ${(comptes.data ?? []).map((c) => `
          <div class="carte ${c.actif ? '' : 'danger'}">
            <div class="rangee">
              <span class="nom">${esc(c.nom ?? 'Sans nom')}</span>
              <span class="info">${c.role === 'super_admin' ? 'Super administrateur' : 'Administrateur'}</span>
            </div>
            <div class="info">Depuis le ${jour(c.cree_le)}${c.actif ? '' : ' · accès bloqué'}</div>
            ${superAdmin && c.role !== 'super_admin' ? `
              <button class="bouton petit ${c.actif ? 'danger' : 'ok'}" style="margin-top:8px"
                data-bloquer="${c.user_id}" data-actif="${c.actif}">
                ${c.actif ? "Bloquer l'accès" : "Rendre l'accès"}
              </button>` : ''}
          </div>`).join('')}

        ${superAdmin ? `
          <h3>Ajouter un administrateur</h3>
          <label>Nom et prénom<input id="nNom" /></label>
          <label>Adresse e-mail<input id="nEmail" type="email" /></label>
          <label>Mot de passe provisoire<input id="nMotDePasse" /></label>
          <button class="bouton" id="creerAdmin">Créer le compte</button>
          <p class="info">
            Un administrateur ouvre des commerces, valide les produits et répond
            aux commerçants. Il ne crée pas de compte d'équipe : toi seul.
          </p>` : '<p class="info">Seul le super administrateur crée des comptes d’équipe.</p>'}

        <h3 style="margin-top:24px">Mon compte</h3>
        <label>Mon nom dans l'équipe<input id="monNom" value="${esc(moi.nom ?? '')}" /></label>
        <button class="bouton sombre" id="enregistrerNom">Enregistrer mon nom</button>
        <label style="margin-top:16px">Nouveau mot de passe
          <input id="monMotDePasse" type="password" placeholder="10 caractères au moins" />
        </label>
        <button type="button" class="lien voir" data-voir="monMotDePasse">Voir</button>
    <button class="bouton sombre" id="changerMotDePasse">Changer mon mot de passe</button>`;

  $$('[data-enregistrer]').forEach((b) => b.addEventListener('click', async () => {
    const code = b.dataset.enregistrer;
    const prix = parseInt($(`[data-prix="${code}"]`).value, 10);
    if (!(prix >= 0)) return alert('Indique un montant en FCFA.');
    const { error } = await bd.from('formule_abonnement')
      .update({ prix_mensuel: prix }).eq('code', code);
    if (error) return echoue(error);
    b.textContent = 'Enregistré';
    setTimeout(() => { b.textContent = 'Enregistrer'; }, 1500);
  }));

  $$('[data-bloquer]').forEach((b) => b.addEventListener('click', async () => {
    const actif = b.dataset.actif === 'true';
    if (!confirm(actif
      ? 'Ce compte ne pourra plus se connecter, et sa session ouverte se ferme. Confirmer ?'
      : 'Rendre l’accès à ce compte ?')) return;
    try {
      await appelerFonction('gerer-equipe',
        { action: actif ? 'desactiver' : 'reactiver', user_id: b.dataset.bloquer });
      aller('equipe');
    } catch (e) { echoue(e); }
  }));

  if (superAdmin) {
    $('#creerAdmin').addEventListener('click', async (ev) => {
      const nom = $('#nNom').value.trim();
      const email = $('#nEmail').value.trim();
      const motDePasse = $('#nMotDePasse').value;
      if (nom.length < 2 || !email || motDePasse.length < 10) {
        return alert('Nom, adresse e-mail, et mot de passe d’au moins 10 caractères.');
      }
      ev.target.disabled = true;
      try {
        await appelerFonction('gerer-equipe',
          { action: 'creer', nom, email, mot_de_passe: motDePasse });
        alert(`Compte créé. ${nom} se connecte avec ${email} et ce mot de passe ; demande-lui de le changer.`);
        aller('equipe');
      } catch (e) {
        echoue(e);
        ev.target.disabled = false;
      }
    });
  }

  $('#enregistrerNom').addEventListener('click', async () => {
    const nom = $('#monNom').value.trim();
    const { error } = await bd.from('admin_plateforme')
      .update({ nom }).eq('user_id', moi.user.id);
    if (error) return echoue(error);
    moi.nom = nom;
    $('#moi').innerHTML =
      `${esc(nom)}<br>${moi.role === 'super_admin' ? 'Super administrateur' : 'Administrateur'}`;
    alert('Nom enregistré.');
  });

  $('#changerMotDePasse').addEventListener('click', async () => {
    const mdp = $('#monMotDePasse').value;
    if (mdp.length < 10) return alert('Au moins 10 caractères : ce compte ouvre tous les commerces.');
    const { error } = await bd.auth.updateUser({ password: mdp });
    if (error) return echoue(error);
    $('#monMotDePasse').value = '';
    alert('Mot de passe changé. Utilise-le à ta prochaine connexion.');
  });
}

// --- Briques d'affichage ---------------------------------------------------

function tableau(colonnes, lignes, vide) {
  if (!lignes.length) return `<p class="info">${esc(vide)}</p>`;
  return `<div class="tableau"><table>
    <thead><tr>${colonnes.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>
      ${lignes.map((l) => `
        <tr class="${l.id ? 'cliquable' : ''}" ${l.id ? `data-id="${esc(l.id)}"` : ''}>
          ${l.cellules.map((c) => `<td>${c}</td>`).join('')}
        </tr>`).join('')}
    </tbody>
  </table></div>`;
}

// Un mot de passe tape a l'aveugle se tape de travers. Un seul ecouteur pour
// toute la page : les champs naissent et meurent au fil des ecrans.
document.addEventListener('click', (ev) => {
  const bouton = ev.target.closest('[data-voir]');
  if (!bouton) return;
  const champ = document.getElementById(bouton.dataset.voir);
  if (!champ) return;
  const cache = champ.type === 'password';
  champ.type = cache ? 'text' : 'password';
  bouton.textContent = cache ? 'Cacher' : 'Voir';
});

const brancherLignes = (ouvrir) =>
  $$('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => ouvrir(tr.dataset.id)));

// --- Le rapport d'un commerce ----------------------------------------------
//
// Les chiffres viennent tous de rapport_commerce(), en base. Ici on ne calcule
// que des additions de ce qu'elle a renvoyé, et on met en phrases.
//
// Les conseils sont des règles, pas des devinettes : chacun s'appuie sur un
// chiffre affiché juste à côté, que le commerçant peut vérifier. Un conseil
// dont on ne voit pas d'où il sort n'est pas suivi.

const JOURS = { 1: 'la journée', 7: 'la semaine', 30: 'le mois' };

// La gravité vient du serveur : elle décide de la couleur du cadre, ici comme
// sur le téléphone du commerçant.
const GRAVITE = { urgent: 'danger', attention: 'accent', info: '' };

// La version que porte l'application aujourd'hui. À changer ici en même temps
// que dans maquis/src/cgu.ts : le CMS ne fait que constater l'écart.
const CGU_COURANTE = '2026-09-b-provisoire';

async function ficheRapport(c, jours = 7) {
  const { data: r, error } = await bd.rpc('rapport_commerce',
    { p_structure: c.id, p_jours: jours });
  if (error) return echoue(error);

  const dortTotal = r.dormants.reduce((n, d) => n + d.valeur, 0);
  const margeTotale = r.meilleurs.every((m) => m.marge != null)
    ? r.meilleurs.reduce((n, m) => n + m.marge, 0) : null;

  ouvrirPanneau(`${c.nom} — rapport`, `
    <button class="bouton sombre" id="retourFiche3">Retour à la fiche</button>
    <div style="display:flex;gap:8px;margin:12px 0">
      ${[1, 7, 30].map((j) => `<button class="bouton ${j === jours ? '' : 'sombre'} petit"
          data-periode="${j}">${j === 1 ? 'Hier et aujourd’hui' : j + ' jours'}</button>`).join('')}
    </div>

    <div class="grille">
      <div class="carte">
        <div class="info">Encaissé sur ${JOURS[jours] ?? jours + ' jours'}</div>
        <div class="gros">${fcfa(r.ventes.total)}</div>
        <div class="info">${r.ventes.factures} facture(s) · panier moyen ${fcfa(r.ventes.panier_moyen)}</div>
      </div>
      <div class="carte ${dortTotal > 0 ? 'accent' : ''}">
        <div class="info">Argent immobilisé en rayon</div>
        <div class="gros">${fcfa(dortTotal)}</div>
        <div class="info">${r.dormants.length} produit(s) sans une seule vente</div>
      </div>
      <div class="carte ${(r.non_remis.montant ?? 0) > 0 ? 'danger' : ''}">
        <div class="info">Encaissé, pas encore remis à la caisse</div>
        <div class="gros">${fcfa(r.non_remis.montant ?? 0)}</div>
        <div class="info">${r.non_remis.vendeurs ?? 0} vendeur(s)</div>
      </div>
      ${margeTotale == null ? '' : `<div class="carte ok">
        <div class="info">Marge sur les dix meilleurs</div>
        <div class="gros">${fcfa(margeTotale)}</div>
      </div>`}
    </div>

    <h3>Ce qu’il faut faire</h3>
    ${(r.conseils ?? []).map((c) =>
      `<div class="carte ${GRAVITE[c.gravite] ?? ''}">
         <div class="nom">${esc(c.titre)}</div>
         <p class="info">${esc(c.texte)}</p>
       </div>`).join('')
      || '<p class="info">Rien à signaler sur cette période.</p>'}

    <h3>Ce qui se vend</h3>
    ${r.meilleurs.length === 0 ? '<p class="info">Aucune vente sur la période.</p>' : `
      <div class="tableau"><table>
        <thead><tr><th>Produit</th><th class="n">Quantité</th><th class="n">Chiffre</th><th class="n">Marge</th><th>Part</th></tr></thead>
        <tbody>${r.meilleurs.map((m) => `<tr>
          <td>${esc(m.nom)}</td>
          <td class="n">${m.quantite}</td>
          <td class="n">${fcfa(m.montant)}</td>
          <td class="n">${m.marge == null ? '<span class="info">—</span>' : fcfa(m.marge)}</td>
          <td style="width:30%">${barre(m.montant / r.meilleurs[0].montant)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`}

    <h3>Ce qui ne bouge pas</h3>
    ${r.dormants.length === 0 ? '<p class="info">Tout le stock a tourné. C’est rare, et c’est bon signe.</p>' : `
      <div class="tableau"><table>
        <thead><tr><th>Produit</th><th class="n">En rayon</th><th class="n">Sans vente depuis</th><th class="n">Argent retenu</th></tr></thead>
        <tbody>${r.dormants.map((d) => `<tr>
          <td>${esc(d.nom)}</td>
          <td class="n">${d.quantite}</td>
          <td class="n">${d.jours_sans_vente} jour(s)</td>
          <td class="n">${fcfa(d.valeur)}${d.au_prix_achat ? '' : ' <span class="info">à la vente</span>'}</td>
        </tr>`).join('')}</tbody>
      </table></div>`}

    <h3>Ce qui manque</h3>
    ${r.ruptures.length === 0 ? '<p class="info">Aucun produit au seuil.</p>' : `
      <div class="tableau"><table>
        <thead><tr><th>Produit</th><th class="n">Restant</th><th class="n">Seuil</th><th class="n">Vendus</th><th>Tenue</th></tr></thead>
        <tbody>${r.ruptures.map((x) => `<tr>
          <td>${esc(x.nom)}</td>
          <td class="n">${x.quantite} ${esc(x.unite)}</td>
          <td class="n">${x.seuil_alerte ?? '—'}</td>
          <td class="n">${x.vendus}</td>
          <td>${esc(tenue(x, jours))}</td>
        </tr>`).join('')}</tbody>
      </table></div>`}

    <h3>Les heures qui travaillent</h3>
    ${r.heures.length === 0 ? '<p class="info">Aucune vente sur la période.</p>' : `
      <div class="tableau"><table><tbody>${r.heures.map((h) => `<tr>
        <td style="width:70px">${String(h.heure).padStart(2, '0')} h</td>
        <td style="width:120px" class="n">${fcfa(h.montant)}</td>
        <td>${barre(h.montant / Math.max(...r.heures.map((y) => y.montant)))}</td>
      </tr>`).join('')}</tbody></table></div>`}

    ${r.annulations.length === 0 ? '' : `<h3>Les annulations</h3>
      <div class="tableau"><table><tbody>${r.annulations.map((a) => `<tr>
        <td>${esc(a.qui)}</td><td class="n">${a.nombre} commande(s) annulée(s)</td>
      </tr>`).join('')}</tbody></table></div>`}

    ${r.ecarts.length === 0 ? '' : `<h3>Les écarts de caisse</h3>
      <div class="tableau"><table><tbody>${r.ecarts.map((e) => `<tr>
        <td>${quand(e.quand)}</td><td>${esc(e.qui)}</td>
        <td class="n">${fcfa(e.ecart)}</td><td>${esc(e.motif ?? '')}</td>
      </tr>`).join('')}</tbody></table></div>`}

    <p class="info" style="margin-top:20px">
      Période du ${quand(r.debut)} au ${quand(r.fin)}. Tous les chiffres sont
      calculés sur la base, jamais estimés.
    </p>
  `);

  $('#retourFiche3').addEventListener('click', () => ficheCommerce(c));
  $$('[data-periode]').forEach((b) =>
    b.addEventListener('click', () => ficheRapport(c, Number(b.dataset.periode))));
}

// Combien de temps le stock restant tient au rythme constaté.
function tenue(x, jours) {
  if (x.quantite <= 0) return 'En rupture';
  if (!x.vendus) return 'Ne se vend pas';
  const parJour = x.vendus / jours;
  const reste = Math.floor(x.quantite / parJour);
  return reste <= 0 ? 'Moins d’un jour' : `Environ ${reste} jour(s)`;
}

// --- Carte et stock d'un commerce -------------------------------------------
//
// Charger trois cents articles au pouce sur un téléphone n'est pas raisonnable :
// c'est exactement ce que le clavier apporte. Le commerçant qui nous le demande
// gagne une soirée, et nous gagnons un client qui démarre vraiment.

async function ficheCarte(c) {
  const [produits, stock, rubriques] = await Promise.all([
    bd.from('produit').select('id, nom, prix_vente, prix_achat, unite, actif, categorie')
      .eq('structure_id', c.id).order('nom'),
    bd.from('stock_actuel').select('produit_id, quantite').eq('structure_id', c.id),
    bd.from('categorie_catalogue').select('code, libelle, rang').order('rang'),
  ]);

  const quantites = new Map((stock.data ?? []).map((l) => [l.produit_id, l.quantite]));
  const libelle = new Map((rubriques.data ?? []).map((r) => [r.code, r.libelle]));
  const rang = new Map((rubriques.data ?? []).map((r) => [r.code, r.rang]));
  const liste = (produits.data ?? []).slice().sort((a, b) =>
    (rang.get(a.categorie) ?? 1e9) - (rang.get(b.categorie) ?? 1e9)
    || String(a.nom).localeCompare(b.nom));

  let rubriqueCourante = null;
  ouvrirPanneau(c.nom + ' — carte et stock', `
    <button class="bouton sombre" id="retourFiche">Retour à la fiche</button>
    <button class="bouton" id="ajouterCatalogue">Ajouter des produits du catalogue</button>

    ${liste.length === 0
      ? '<p class="info">Ce commerce n’a aucun produit. Commence par le catalogue.</p>'
      : `<p class="info">
           Saisis une quantité en face des produits livrés, puis enregistre. Les
           champs laissés vides ne bougent rien.
         </p>
         <div class="tableau"><table>
           <thead><tr>
             <th>Produit</th><th class="n">Achat</th><th class="n">Vente</th>
             <th class="n">Marge</th><th class="n">En stock</th>
             <th class="n">Entrée à saisir</th>
           </tr></thead>
           <tbody>
           ${liste.map((p) => {
             const r = libelle.get(p.categorie) ?? 'Sans rubrique';
             const entete = r !== rubriqueCourante
               ? `<tr><td colspan="6" class="info" style="padding-top:14px">${esc(r)}</td></tr>` : '';
             rubriqueCourante = r;
             return entete + `<tr>
               <td>${esc(p.nom)}${p.actif ? '' : ' <span class="info">· retiré de la carte</span>'}
                   <div class="info">${esc(p.unite)}</div></td>
               <td class="n">${p.prix_achat == null ? '<span class="info">—</span>' : fcfa(p.prix_achat)}</td>
               <td class="n">${p.prix_vente ? fcfa(p.prix_vente) : '<span class="etiquette accent">prix à saisir</span>'}</td>
               <td class="n">${marge(p)}</td>
               <td class="n">${quantites.get(p.id) ?? 0}</td>
               <td class="n"><input data-entree="${esc(p.id)}" type="number" min="1"
                     style="width:110px;text-align:right" /></td>
             </tr>`;
           }).join('')}
           </tbody>
         </table></div>
         <button class="bouton ok" id="enregistrerEntrees">Enregistrer les entrées</button>`}
  `);

  $('#retourFiche').addEventListener('click', () => ficheCommerce(c));
  $('#ajouterCatalogue').addEventListener('click', () => ficheCatalogueCommerce(c));

  const bouton = $('#enregistrerEntrees');
  if (!bouton) return;
  bouton.addEventListener('click', async () => {
    const entrees = $$('[data-entree]')
      .map((i) => ({ produit_id: i.dataset.entree, quantite: parseInt(i.value, 10) }))
      .filter((e) => Number.isInteger(e.quantite) && e.quantite > 0);
    if (!entrees.length) return alert('Aucune quantité saisie.');
    const total = entrees.reduce((n, e) => n + e.quantite, 0);
    if (!confirm(`${entrees.length} produit(s), ${total} unité(s) ajoutées au stock de ${c.nom}. `
                 + `L’entrée portera le nom de Mon Djê. Confirmer ?`)) return;
    bouton.disabled = true;
    try {
      await appelerFonction('charger-stock-commerce', { structure_id: c.id, entrees });
      ficheCarte(c);
    } catch (e) {
      echoue(e);
      bouton.disabled = false;
    }
  });
}

// Ce qui reste au commerçant sur chaque vente. Muet tant que le prix d'achat
// manque : un chiffre faux vaut moins que pas de chiffre.
function marge(p) {
  if (p.prix_achat == null || !p.prix_vente) return '<span class="info">—</span>';
  const gain = p.prix_vente - p.prix_achat;
  const part = Math.round((gain / p.prix_vente) * 100);
  return `${fcfa(gain)} <span class="info">${part} %</span>`;
}

// Le catalogue, filtré par rubrique : deux cent cinquante lignes d'un coup ne
// se lisent pas, même sur grand écran.
async function ficheCatalogueCommerce(c) {
  const activite = c.type_commerce === 'restauration' ? 'bar_maquis' : 'boutique';
  const [articles, deja] = await Promise.all([
    bd.from('catalogue_produit')
      .select('id, nom, contenance, categorie, unite, categorie_catalogue (libelle, rang)')
      .eq('actif', true).contains('activites', [activite]).order('nom'),
    bd.from('produit').select('nom').eq('structure_id', c.id),
  ]);

  const nomComplet = (a) => (a.contenance ? a.nom + ' ' + a.contenance : a.nom);
  const pris = new Set((deja.data ?? []).map((p) => String(p.nom).trim().toLowerCase()));
  const libres = (articles.data ?? [])
    .filter((a) => !pris.has(nomComplet(a).trim().toLowerCase()))
    .sort((x, y) => (x.categorie_catalogue?.rang ?? 1e9) - (y.categorie_catalogue?.rang ?? 1e9)
      || nomComplet(x).localeCompare(nomComplet(y)));

  const desRubriques = [...new Map(libres.map((a) =>
    [a.categorie, a.categorie_catalogue?.libelle ?? a.categorie])).entries()];

  ouvrirPanneau(c.nom + ' — ajouter des produits', `
    <button class="bouton sombre" id="retourCarte">Retour à la carte</button>
    <p class="info">
      Le prix d'achat est facultatif : sans lui, pas de marge ni d'argent
      immobilisé, mais le produit se vend quand même.
      Saisis un prix de vente en face des produits qu'il vend. Sans prix, le produit
      arrive sur sa carte mais reste invendable tant qu'il n'a pas fixé le sien :
      un article à 0 F ne doit jamais partir en caisse.
    </p>
    <div class="ligne-champs">
      <label>Rubrique
        <select id="filtreRubrique">
          <option value="">Toutes les rubriques</option>
          ${desRubriques.map(([code, lib]) =>
            `<option value="${esc(code)}">${esc(lib)}</option>`).join('')}
        </select>
      </label>
      <label>Chercher<input id="filtreNom" placeholder="Nom du produit" /></label>
    </div>
    <div id="listeCatalogue"></div>
    <button class="bouton ok" id="ajouterLesProduits">Ajouter les produits</button>
  `);

  // Les prix saisis survivent au changement de filtre : on les garde ici, pas
  // dans le HTML qu'on redessine.
  const prix = new Map();
  const achats = new Map();

  const dessiner = () => {
    const r = $('#filtreRubrique').value;
    const mot = $('#filtreNom').value.trim().toLowerCase();
    const vus = libres.filter((a) =>
      (!r || a.categorie === r) && (!mot || nomComplet(a).toLowerCase().includes(mot)));
    let courante = null;
    $('#listeCatalogue').innerHTML = vus.length === 0
      ? '<p class="info">Rien à ajouter ici : tout est déjà sur sa carte.</p>'
      : `<div class="tableau"><table><tbody>${vus.slice(0, 400).map((a) => {
          const lib = a.categorie_catalogue?.libelle ?? a.categorie;
          const entete = lib !== courante
            ? `<tr><td colspan="3" class="info" style="padding-top:14px">${esc(lib)}</td></tr>` : '';
          courante = lib;
          return entete + `<tr>
            <td>${esc(nomComplet(a))}<div class="info">${esc(a.unite)}</div></td>
            <td class="n"><input data-achat="${esc(a.id)}" type="number" min="0"
                  placeholder="Achat" value="${esc(achats.get(a.id) ?? '')}"
                  style="width:100px;text-align:right" /></td>
            <td class="n"><input data-prix="${esc(a.id)}" type="number" min="0"
                  placeholder="Vente" value="${esc(prix.get(a.id) ?? '')}"
                  style="width:100px;text-align:right" /></td>
          </tr>`;
        }).join('')}</tbody></table></div>`
        + (vus.length > 400 ? '<p class="info">Affichage limité à 400 lignes : affine la recherche.</p>' : '');
  };

  dessiner();
  $('#filtreRubrique').addEventListener('change', () => { garderPrix(); dessiner(); });
  $('#filtreNom').addEventListener('input', () => { garderPrix(); dessiner(); });
  $('#retourCarte').addEventListener('click', () => ficheCarte(c));

  function garderPrix() {
    const noter = (carte, attribut) => $$(`[data-${attribut}]`).forEach((i) => {
      if (i.value.trim()) carte.set(i.dataset[attribut], i.value.trim());
      else carte.delete(i.dataset[attribut]);
    });
    noter(prix, 'prix');
    noter(achats, 'achat');
  }

  $('#ajouterLesProduits').addEventListener('click', async (ev) => {
    garderPrix();
    const produits = [...prix.entries()]
      .map(([catalogue_id, v]) => {
        const achat = parseInt(achats.get(catalogue_id), 10);
        return {
          catalogue_id,
          prix: parseInt(v, 10),
          ...(Number.isInteger(achat) ? { prix_achat: achat } : {}),
        };
      })
      .filter((p) => Number.isInteger(p.prix) && p.prix >= 0);
    if (!produits.length) return alert('Saisis au moins un prix.');
    ev.target.disabled = true;
    try {
      const r = await appelerFonction('ajouter-produits-commerce', { structure_id: c.id, produits });
      alert(`${r.ajoutes} produit(s) ajouté(s) à la carte de ${c.nom}.`
            + (r.ignores ? `\n${r.ignores} déjà présent(s), laissé(s) tels quels.` : '')
            + (r.sans_prix ? `\n${r.sans_prix} sans prix : invendables tant que le propriétaire n’a pas fixé le sien.` : ''));
      ficheCarte(c);
    } catch (e) {
      echoue(e);
      ev.target.disabled = false;
    }
  });
}

// --- L'activité d'un commerce ----------------------------------------------

const GENRES = {
  encaissement: 'Encaissement', paiement_declare: 'Paiement déclaré',
  contestation: 'Contestation', paiement_annule: 'Paiement annulé',
  commande_annulee: 'Commande annulée',
  stock_entree: 'Entrée de stock', stock_perte: 'Perte',
  stock_ajustement: 'Ajustement', stock_retour: 'Retour',
  caisse_ouverte: 'Caisse ouverte', caisse_fermee: 'Caisse fermée',
  intervention: 'Intervention Mon Djê',
};

async function ficheActivite(c) {
  const { data, error } = await bd.from('activite_commerce')
    .select('*').eq('structure_id', c.id).order('quand', { ascending: false }).limit(300);
  if (error) return echoue(error);

  ouvrirPanneau(c.nom + ' — historique', `
    <button class="bouton sombre" id="retourFiche2">Retour à la fiche</button>
    <label>N'afficher que
      <select id="filtreGenre">
        <option value="">Tout</option>
        ${Object.entries(GENRES).map(([g, l]) =>
          `<option value="${g}">${esc(l)}</option>`).join('')}
      </select>
    </label>
    <div id="frise"></div>
  `);

  const dessiner = () => {
    const g = $('#filtreGenre').value;
    const vus = (data ?? []).filter((l) => !g || l.genre === g);
    $('#frise').innerHTML = vus.length === 0
      ? '<p class="info">Rien à montrer.</p>'
      : `<div class="tableau"><table>
           <thead><tr><th>Quand</th><th>Quoi</th><th>Qui</th><th>Détail</th><th class="n">Montant</th></tr></thead>
           <tbody>${vus.map((l) => `<tr>
             <td>${quand(l.quand)}</td>
             <td>${esc(GENRES[l.genre] ?? l.genre)}</td>
             <td>${esc(l.qui)}</td>
             <td>${esc(ACTIONS[l.resume] ?? l.resume)}</td>
             <td class="n">${l.montant == null ? '' : fcfa(l.montant)}</td>
           </tr>`).join('')}</tbody>
         </table></div>
         <p class="info">${vus.length} évènement(s), du plus récent au plus ancien.</p>`;
  };

  dessiner();
  $('#filtreGenre').addEventListener('change', dessiner);
  $('#retourFiche2').addEventListener('click', () => ficheCommerce(c));
}

// Un code neuf ne s'affiche qu'une fois : il n'est écrit nulle part, ni chez
// nous ni dans la base. Cette page est le seul endroit où on le voit, d'où le
// message tout prêt à envoyer au commerçant avant de quitter l'écran.
function montrerCode(commerce, r) {
  const message =
    `${r.membre}, ton code secret Mon Djê pour « ${r.structure} » a été réinitialisé.

`
    + `• Code commerce : ${r.code_commerce}
`
    + `• N° d'employé : ${r.code_employe}
`
    + `• Nouveau code secret : ${r.code_secret}

`
    + `Ton ancien code ne marche plus. Change celui-ci dès ta connexion `
    + `(Profil → Changer mon code secret).
`
    + `Si tu n'as rien demandé, préviens-nous tout de suite.`;
  const numero = numeroWhatsApp(r.telephone ?? commerce.telephone);

  ouvrirPanneau('Nouveau code secret', `
    <div class="carte accent">
      ${champLecture('Personne', `${r.membre} · ${r.structure}`)}
      ${champLecture('Code commerce', r.code_commerce)}
      ${champLecture("N° d'employé", r.code_employe)}
      ${champLecture('Code secret', r.code_secret)}
      <p class="info">
        Ce code ne se réaffichera jamais. Envoie-le maintenant ; s'il se perd,
        il faudra en tirer un autre.
      </p>
    </div>
    ${numero
      ? `<a class="bouton ok" style="display:inline-block;text-decoration:none"
           href="https://wa.me/${numero}?text=${encodeURIComponent(message)}"
           target="_blank" rel="noopener">Envoyer par WhatsApp</a>`
      : '<p class="info">Ce commerce n’a pas de numéro WhatsApp enregistré.</p>'}
    <button class="bouton sombre" id="copier">Copier le message</button>
  `);

  $('#copier').addEventListener('click', async (ev) => {
    try {
      await navigator.clipboard.writeText(message);
      ev.target.textContent = 'Message copié';
    } catch {
      ev.target.textContent = 'Copie refusée par le navigateur';
    }
  });
}

// Wave, WhatsApp et les autres veulent le numéro au format international ;
// les commerces saisissent « 0505522776 ».
function numeroWhatsApp(tel) {
  const chiffres = String(tel ?? '').replace(/\D/g, '');
  if (chiffres.length === 10 && chiffres.startsWith('0')) return `225${chiffres}`;
  if (chiffres.length === 13 && chiffres.startsWith('225')) return chiffres;
  return chiffres.length >= 8 ? chiffres : '';
}

const champLecture = (libelle, valeur) => valeur
  ? `<div class="info">${esc(libelle)}</div><div class="nom" style="margin-bottom:10px">${esc(valeur)}</div>`
  : '';

// --- Démarrage -------------------------------------------------------------

bd.auth.getSession().then(({ data }) => { if (data.session) demarrer(); });
