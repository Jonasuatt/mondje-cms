// La page publique d'un commerce : .../vitrine/?c=28KP4U
//
// Aucun compte, aucune session. La base ne rend que deux vues, qui filtrent
// elles-mêmes sur les commerces ayant demandé leur page. Un code inconnu ou un
// commerce qui n'a rien ouvert ne montre rien — pas même son existence.

const URL_SUPABASE = 'https://xflrfpmsatikglixxtxs.supabase.co';
const CLE_PUBLIQUE = 'sb_publishable__o--lkXqrhp8MvCruh5aCA_AoBSlLLB';
const SEAU_LOGO = `${URL_SUPABASE}/storage/v1/object/public/logo-commerce/`;

const bd = supabase.createClient(URL_SUPABASE, CLE_PUBLIQUE);

// --- Le compteur ------------------------------------------------------------------
//
// Ni cookie, ni adresse IP, ni identifiant : on ne sait pas QUI est venu, on sait
// COMBIEN de fois. La base ne garde qu'un total par jour et par commerce.
//
// Ne comptent pas : le propriétaire qui regarde sa propre page (le lien de
// l'application porte « apercu »), et les robots — un aperçu de lien WhatsApp ne
// lance pas de JavaScript, mais un moteur de recherche, si.
const parametres = new URLSearchParams(location.search);
const apercu = parametres.has('apercu');
const robot = navigator.webdriver
  || /bot|crawl|spider|preview|headless|lighthouse/i.test(navigator.userAgent);

// « keepalive » : le clic sur WhatsApp ou sur le numéro quitte la page aussitôt, et
// la requête doit partir quand même.
function compter(evenement) {
  const code = parametres.get('c');
  if (apercu || robot || !code) return;
  try {
    fetch(`${URL_SUPABASE}/rest/v1/rpc/compter_vitrine`, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: CLE_PUBLIQUE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code, p_evenement: evenement }),
    }).catch(() => {});
  } catch { /* un compteur ne doit jamais gêner la page */ }
}

// Une visite par onglet : recharger la page ne la recompte pas. L'onglet retient
// seulement « déjà compté » — rien de ce qui l'identifie ne part.
function compterVisite() {
  // Le drapeau ne se pose que si la visite part vraiment : un aperçu ou un robot
  // qui le poserait sans rien envoyer ferait croire, dans le même onglet, que la
  // vraie visite suivante est déjà comptée.
  if (apercu || robot || !parametres.get('c')) return;
  try {
    const cle = `vu_${parametres.get('c')}`;
    if (sessionStorage.getItem(cle)) return;
    sessionStorage.setItem(cle, '1');
  } catch { /* navigation privée : on compte à chaque ouverture, faute de mieux */ }
  compter('visite');
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fcfa = (n) => String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F';

// Les commerces saisissent « 0505522776 » ; WhatsApp veut l'international.
function numeroWhatsApp(tel) {
  const chiffres = String(tel ?? '').replace(/\D/g, '');
  if (chiffres.length === 10 && chiffres.startsWith('0')) return `225${chiffres}`;
  if (chiffres.length === 13 && chiffres.startsWith('225')) return chiffres;
  return chiffres.length >= 8 ? chiffres : '';
}

// --- Parler au commerce sur WhatsApp ---------------------------------------------------
//
// Réserver, participer à un événement, commander un produit de la galerie : trois questionnaires dans la même
// fenêtre, une seule fin. Le client répond aux questions, la page compose le message avec ses réponses et ouvre le
// WhatsApp du commerce ; c'est le client qui l'envoie. Rien n'est enregistré chez nous : pas de nom, pas de
// numéro, pas de demande.
let page = { nom: '', numero: '', annonce: '' };
let demande = null; // ce que la fenêtre ouverte est en train de demander : { type, produit }

function ouvrirWhatsApp(message) {
  if (!page.numero) return;
  compter('whatsapp');
  window.open(`https://wa.me/${page.numero}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
}

const uneLigne = (t, max = 160) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
};

const aujourdhui = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-JJ, à l'heure du téléphone
const jourLisible = (jour) => {
  const [y, m, d] = jour.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const heureLisible = (heure) => { const [hh, mm] = heure.split(':'); return `${Number(hh)} h ${mm}`; };

// Les champs, les mêmes partout : un questionnaire n'est qu'une liste de champs.
const CHAMPS = {
  jour: () => `<label>Jour<input type="date" id="fJour" min="${aujourdhui()}" /></label>`,
  heure: () => '<label>Heure<input type="time" id="fHeure" /></label>',
  nombre: (libelle = 'Nombre de personnes') =>
    `<label>${libelle}<input type="number" id="fNombre" min="1" max="100" inputmode="numeric" /></label>`,
  commande: (valeur = '') =>
    `<label>Commande<input type="text" id="fCommande" maxlength="120" value="${esc(valeur)}" placeholder="Ce que vous voulez commander" /></label>`,
};

const pied_modale = (retour = false) => `
  <p class="erreur" id="rErreur"></p>
  <div class="actions-modale">
    <button type="button" class="non" ${retour ? 'data-retour' : 'data-fermer'}>${retour ? 'Retour' : 'Annuler'}</button>
    <button type="button" class="oui" data-envoyer>Envoyer sur WhatsApp</button>
  </div>`;

// La fenêtre : un seul conteneur, rempli selon la demande.
const modale = document.getElementById('modale');
const corpsModale = document.getElementById('modaleCorps');
const fermerModale = () => { modale.classList.add('cache'); corpsModale.innerHTML = ''; demande = null; };
function ouvrirModale(html) {
  corpsModale.innerHTML = html;
  modale.classList.remove('cache');
  corpsModale.querySelector('input, .oui')?.focus?.();
}

function ouvrirReservation() {
  demande = { type: 'reservation' };
  ouvrirModale(`
    <h2>Réserver chez ${esc(page.nom)}</h2>
    <p>Dites-nous quand vous venez : la demande part sur WhatsApp.</p>
    ${CHAMPS.jour()}${CHAMPS.heure()}${CHAMPS.nombre()}
    ${pied_modale()}`);
}

// L'affiche : on demande d'abord si le client veut vraiment venir. « Non » ferme ; « Oui » pose la dernière question.
function ouvrirEvenement() {
  demande = { type: 'evenement-question' };
  const affiche = document.querySelector('.annonce img')?.src;
  ouvrirModale(`
    ${affiche ? `<img class="affiche" src="${esc(affiche)}" alt="Affiche de l’événement" />` : ''}
    ${page.annonce ? `<p class="phrase">${esc(page.annonce)}</p>` : ''}
    <h2>Voulez-vous participer à cet événement ?</h2>
    <div class="actions-modale">
      <button type="button" class="non" data-fermer>Non</button>
      <button type="button" class="oui" data-participer>Oui</button>
    </div>`);
}

function ouvrirParticipation() {
  demande = { type: 'evenement' };
  ouvrirModale(`
    <h2>Participer à l’événement</h2>
    ${page.annonce ? `<p class="phrase">${esc(page.annonce)}</p>` : ''}
    ${CHAMPS.nombre()}
    ${pied_modale(true)}`);
}

// Un produit de la galerie : son nom est donné, le client dit quand, quoi et combien.
function ouvrirProduit(figure) {
  const produit = uneLigne(figure.dataset.produit, 80);
  const photo = figure.querySelector('img')?.src;
  demande = { type: 'produit', produit };
  ouvrirModale(`
    <h2>Commander${produit ? ` : ${esc(produit)}` : ''}</h2>
    ${photo ? `<img class="affiche" style="max-height:22vh" src="${esc(photo)}" alt="${esc(produit)}" />` : ''}
    ${CHAMPS.jour()}${CHAMPS.heure()}${CHAMPS.commande(produit)}${CHAMPS.nombre('Nombre')}
    ${pied_modale()}`);
}

// Lit les réponses, dit ce qui manque, compose le message, ouvre WhatsApp.
function envoyerDemande() {
  if (!demande) return;
  const lire = (id) => document.getElementById(id)?.value ?? '';
  const erreur = (t) => { document.getElementById('rErreur').textContent = t; };
  const jour = lire('fJour');
  const heure = lire('fHeure');
  const nombre = Number(lire('fNombre'));
  const commande = uneLigne(lire('fCommande'), 120);

  if (demande.type !== 'evenement') {
    if (!jour) return erreur('Choisissez le jour.');
    if (jour < aujourdhui()) return erreur('Ce jour est déjà passé.');
    if (!heure) return erreur('Choisissez l’heure.');
  }
  if (demande.type === 'produit' && !commande) return erreur('Dites ce que vous voulez commander.');
  if (!Number.isInteger(nombre) || nombre < 1 || nombre > 100) {
    return erreur(demande.type === 'produit' ? 'Indiquez le nombre (1 à 100).' : 'Indiquez le nombre de personnes (1 à 100).');
  }

  let message;
  if (demande.type === 'reservation') {
    message = `Bonjour ${page.nom}, je souhaite faire une réservation :\n\n• Jour : ${jourLisible(jour)}\n• Heure : ${heureLisible(heure)}\n• Nombre de personnes : ${nombre}\n\nMerci de me confirmer.`;
  } else if (demande.type === 'evenement') {
    const texte = uneLigne(page.annonce, 140);
    message = `Bonjour ${page.nom} ! Je souhaite participer à l’événement ${texte ? `« ${texte} »` : 'à l’affiche'}.\n\n• Nombre de personnes : ${nombre}\n\nVous confirmez votre présence ? Oui`;
  } else {
    const nom = demande.produit || 'un produit de la galerie';
    message = `Bonjour ${page.nom}, je souhaite commander : ${nom}.\n\n• Produit : ${nom}\n• Jour : ${jourLisible(jour)}\n• Heure : ${heureLisible(heure)}\n• Commande : ${commande}\n• Nombre : ${nombre}\n\nMerci de me confirmer.`;
  }
  ouvrirWhatsApp(message);
  fermerModale();
}

// Beaucoup de villes de l'intérieur n'ont qu'une commune, qui porte leur nom :
// « Bouaké · Bouaké » ferait négligé sur la page d'un commerçant.
const lieu = (c) => [...new Set([c.quartier, c.commune, c.ville].filter(Boolean))].join(' · ');

function afficher(html) {
  document.getElementById('vitrine').innerHTML = html;
}

function introuvable() {
  document.title = 'Commerce introuvable — Mon Djê';
  afficher(`
    <p class="attente">
      Cette page n'existe pas, ou le commerce ne l'a pas encore ouverte.<br />
      Vérifie le lien qu'on t'a envoyé.
    </p>
    ${pied()}`);
}

// Ce que le commerce a voulu dire aujourd'hui : une phrase, une affiche, ou
// les deux. La vue ne la rend plus passé sa date, donc rien à vérifier ici.
function annonce(c, numero) {
  if (!c.annonce_texte && !c.annonce_affiche_chemin) return '';
  return `
    <h2 class="titre-bloc">Événement à l'affiche</h2>
    <div class="annonce${numero ? ' cliquable' : ''}"${numero ? ' data-evenement role="button" tabindex="0"' : ''}>
      ${c.annonce_affiche_chemin
        ? `<img src="${esc(SEAU_LOGO + c.annonce_affiche_chemin)}" alt="Annonce" />` : ''}
      ${c.annonce_texte ? `<p>${esc(c.annonce_texte)}</p>` : ''}
      ${numero ? '<p class="indice">Touchez l’annonce pour participer.</p>' : ''}
    </div>`;
}

// Ce que le commerce sert, en images. La légende est facultative : une photo
// de poisson braisé se passe de commentaire, mais « Poulet braisé, 3000 F le
// demi » en dit plus qu'une ligne de carte.
function galerie(photos, numero) {
  if (photos.length === 0) return '';
  return `
    <h2 class="titre-bloc">Galerie du jour</h2>
    ${numero ? '<p class="indice" style="margin:0 0 4px">Touchez un produit pour le commander sur WhatsApp.</p>' : ''}
    <div class="photos">
      ${photos.map((p) => `
        <figure class="photo${numero ? ' cliquable' : ''}"${numero ? ` data-produit="${esc(p.legende ?? '')}"` : ''}>
          <img src="${esc(SEAU_LOGO + p.chemin)}" alt="${esc(p.legende ?? '')}" loading="lazy" />
          ${p.legende ? `<figcaption>${esc(p.legende)}</figcaption>` : ''}
          ${numero ? '<span class="cmd">Commander</span>' : ''}
        </figure>`).join('')}
    </div>`;
}

const pied = () => `
  <p class="pied">
    <img src="../logo-mondje.png" alt="" />
    Page tenue à jour par Mon Djê, d'après le stock réel du commerce.<br />
    <small>Les visites sont comptées, sans cookie et sans rien savoir de vous.</small>
  </p>
  <details class="apropos">
    <summary>Qui est derrière Mon Djê ?</summary>
    <div data-credits><p>Chargement…</p></div>
    <p><a href="https://mondje.ci">mondje.ci</a></p>
  </details>`;

// Le texte des crédits est un fragment du site (cms/apropos/credits.html), chargé à la première ouverture :
// la page d'un commerce reste légère pour qui ne l'ouvre pas.
document.addEventListener('toggle', (e) => {
  const zone = e.target.matches?.('details.apropos') && e.target.open && e.target.querySelector('[data-credits]');
  if (!zone || zone.dataset.charge) return;
  zone.dataset.charge = '1';
  fetch('../apropos/credits.html').then((r) => r.text()).then((h) => { zone.innerHTML = h; })
    .catch(() => { zone.innerHTML = '<p>Voir <a href="../apropos/">mondje.ci/apropos</a>.</p>'; delete zone.dataset.charge; });
}, true);

async function demarrer() {
  const code = new URLSearchParams(location.search).get('c');
  if (!code) return introuvable();

  const [commerce, produits, images] = await Promise.all([
    bd.from('vitrine_commerce').select('*').eq('code', code.toUpperCase()).maybeSingle(),
    bd.from('vitrine_produit').select('*').eq('code', code.toUpperCase())
      .order('rang').order('nom'),
    bd.from('vitrine_photo').select('*').eq('code', code.toUpperCase())
      .order('rang').order('cree_le'),
  ]);

  const c = commerce.data;
  if (!c) return introuvable();

  document.title = `${c.nom} — ${lieu(c) || 'Côte d’Ivoire'}`;

  const numero = numeroWhatsApp(c.telephone);
  page = { nom: c.nom, numero, annonce: c.annonce_texte ?? '' };
  const articles = produits.data ?? [];
  let rayon = null;

  afficher(`
    <div class="enseigne">
      ${c.logo_chemin ? `<img src="${esc(SEAU_LOGO + c.logo_chemin)}" alt="" />` : ''}
      <h1>${esc(c.nom)}</h1>
    </div>
    <p class="lieu">${esc(lieu(c))}</p>

    ${numero ? `<a class="appel" href="https://wa.me/${numero}" target="_blank" rel="noopener">
      Écrire sur WhatsApp</a>` : ''}
    ${c.telephone ? `<a class="appel tel" href="tel:${esc(c.telephone)}">
      Appeler ${esc(c.telephone)}</a>` : ''}

    ${numero && ['restauration', 'location'].includes(c.type_commerce)
      ? '<button type="button" class="appel reserver" data-reserver>Réserver</button>' : ''}

    ${annonce(c, numero)}
    ${galerie(images.data ?? [], numero)}

    ${articles.length === 0
      ? '<p class="lieu" style="margin-top:24px">La liste des produits arrive bientôt.</p>'
      : articles.map((a) => {
          const entete = a.rubrique !== rayon
            ? `<div class="rayon">${esc(a.rubrique)}</div>` : '';
          rayon = a.rubrique;
          return entete + `
            <div class="article">
              <div>
                <div>${esc(a.nom)}</div>
                <div class="unite">${esc(a.unite)}</div>
              </div>
              ${a.prix == null ? '' : `<div class="prix">${fcfa(a.prix)}</div>`}
            </div>`;
        }).join('')}

    ${pied()}`);

  compterVisite();
}

// Une affiche porte un numéro de téléphone et une date : sur un téléphone, à
// la taille où elle s'affiche, personne ne les lit. Un toucher l'ouvre en
// grand, un autre la referme — pas de bibliothèque pour ça.
const loupe = document.getElementById('loupe');
let ouverteA = 0;

function ouvrirLoupe(img) {
  document.getElementById('loupeImage').src = img.src;
  const legende = img.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
  document.getElementById('loupeLegende').textContent = legende;
  loupe.classList.remove('cache');
  ouverteA = Date.now();
}

const fermerLoupe = () => loupe.classList.add('cache');

document.addEventListener('click', (ev) => {
  // Les demandes au commerce : réserver, participer à l'événement, commander un produit de la galerie.
  if (ev.target.closest('[data-reserver]')) return ouvrirReservation();
  if (ev.target.closest('[data-envoyer]')) return envoyerDemande();
  if (ev.target.closest('[data-participer]')) return ouvrirParticipation();
  if (ev.target.closest('[data-retour]')) return ouvrirEvenement();
  if (ev.target.closest('[data-fermer]') || ev.target === modale) return fermerModale();
  if (page.numero && ev.target.closest('[data-evenement]')) return ouvrirEvenement();
  const produit = page.numero && ev.target.closest('.photo.cliquable');
  if (produit) return ouvrirProduit(produit);

  // Sans numéro WhatsApp, rien à ouvrir : l'image s'agrandit seulement.
  const image = ev.target.closest('.annonce img, .photo img');
  if (image) return ouvrirLoupe(image);
  // Sur un telephone, le toucher declenche un clic fantome quelques dizaines de
  // millisecondes plus tard. La loupe est deja ouverte a ce moment-la, et le
  // clic retombe dessus : elle se refermait aussitot.
  if (loupe.contains(ev.target) && Date.now() - ouverteA > 400) fermerLoupe();
});
// Dès que le client corrige un champ, l'ancien message d'erreur n'a plus lieu d'être.
document.addEventListener('input', (ev) => {
  if (ev.target.closest?.('#modale')) {
    const erreur = document.getElementById('rErreur');
    if (erreur) erreur.textContent = '';
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { fermerLoupe(); fermerModale(); }
  // L'annonce est un « bouton » : Entrée ou Espace l'ouvre aussi, pour qui n'a pas d'écran tactile.
  if ((ev.key === 'Enter' || ev.key === ' ') && page.numero && ev.target.matches?.('[data-evenement]')) {
    ev.preventDefault();
    ouvrirEvenement();
  }
});

// Ce qui compte vraiment : une page qu'on ouvre ne rapporte rien, une page dont on
// touche le numéro, si.
document.addEventListener('click', (ev) => {
  const lien = ev.target.closest('a.appel');
  if (lien) compter(lien.classList.contains('tel') ? 'appel' : 'whatsapp');
});

demarrer().catch(introuvable);
