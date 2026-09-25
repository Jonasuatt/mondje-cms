// La page publique d'un commerce : .../vitrine/?c=28KP4U
//
// Aucun compte, aucune session. La base ne rend que deux vues, qui filtrent
// elles-mêmes sur les commerces ayant demandé leur page. Un code inconnu ou un
// commerce qui n'a rien ouvert ne montre rien — pas même son existence.

const URL_SUPABASE = 'https://xflrfpmsatikglixxtxs.supabase.co';
const CLE_PUBLIQUE = 'sb_publishable__o--lkXqrhp8MvCruh5aCA_AoBSlLLB';
const SEAU_LOGO = `${URL_SUPABASE}/storage/v1/object/public/logo-commerce/`;

const bd = supabase.createClient(URL_SUPABASE, CLE_PUBLIQUE);

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
function annonce(c) {
  if (!c.annonce_texte && !c.annonce_affiche_chemin) return '';
  return `
    <h2 class="titre-bloc">Événement à l'affiche</h2>
    <div class="annonce">
      ${c.annonce_affiche_chemin
        ? `<img src="${esc(SEAU_LOGO + c.annonce_affiche_chemin)}" alt="Annonce" />` : ''}
      ${c.annonce_texte ? `<p>${esc(c.annonce_texte)}</p>` : ''}
    </div>`;
}

// Ce que le commerce sert, en images. La légende est facultative : une photo
// de poisson braisé se passe de commentaire, mais « Poulet braisé, 3000 F le
// demi » en dit plus qu'une ligne de carte.
function galerie(photos) {
  if (photos.length === 0) return '';
  return `
    <h2 class="titre-bloc">Galerie du jour</h2>
    <div class="photos">
      ${photos.map((p) => `
        <figure class="photo">
          <img src="${esc(SEAU_LOGO + p.chemin)}" alt="${esc(p.legende ?? '')}" loading="lazy" />
          ${p.legende ? `<figcaption>${esc(p.legende)}</figcaption>` : ''}
        </figure>`).join('')}
    </div>`;
}

const pied = () => `
  <p class="pied">
    <img src="../logo-mondje.png" alt="" />
    Page tenue à jour par Mon Djê, d'après le stock réel du commerce.
  </p>`;

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

    ${annonce(c)}
    ${galerie(images.data ?? [])}

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
  const image = ev.target.closest('.annonce img, .photo img');
  if (image) return ouvrirLoupe(image);
  // Sur un telephone, le toucher declenche un clic fantome quelques dizaines de
  // millisecondes plus tard. La loupe est deja ouverte a ce moment-la, et le
  // clic retombe dessus : elle se refermait aussitot.
  if (loupe.contains(ev.target) && Date.now() - ouverteA > 400) fermerLoupe();
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') fermerLoupe();
});

demarrer().catch(introuvable);
