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

const pied = () => `
  <p class="pied">
    <img src="../logo-mondje.png" alt="" />
    Page tenue à jour par Mon Djê, d'après le stock réel du commerce.
  </p>`;

async function demarrer() {
  const code = new URLSearchParams(location.search).get('c');
  if (!code) return introuvable();

  const [commerce, produits] = await Promise.all([
    bd.from('vitrine_commerce').select('*').eq('code', code.toUpperCase()).maybeSingle(),
    bd.from('vitrine_produit').select('*').eq('code', code.toUpperCase())
      .order('rang').order('nom'),
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

demarrer().catch(introuvable);
