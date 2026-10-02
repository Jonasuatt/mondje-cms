// Génère cms/guide/index.html à partir du guide de l'application (maquis/src/guide.ts) : un seul texte, deux
// endroits (le téléphone et le site), donc jamais deux versions qui se contredisent.
//
//   node --experimental-strip-types --import ./cms/guide/ts-resolve.mjs cms/guide/generer.mjs
//
// Les captures d'écran sont facultatives : une section affiche sa capture si le fichier cms/img/guide/<clé>.webp existe
// (voir CAPTURES ci-dessous). Les captures se refont avec supabase/demo (comptes de démonstration).
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMUN, CAISSIER, GERANT, PROPRIETAIRE, LOCATION, DEBUT_COMMANDE, vendeur } from '../../maquis/src/guide.ts';
import { AUTEUR, STRUCTURES, SITE_WEB, SITE_WEB_URL } from '../../maquis/src/apropos.ts';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..');

const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cle = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ROLES = [
  { id: 'vendeur', titre: 'Je vends', qui: 'Vendeur, serveur, vendeuse : prendre les commandes et encaisser.', sections: vendeur('vente_directe') },
  { id: 'caisse', titre: 'Je tiens la caisse', qui: 'Caissier ou caissière : valider les paiements, compter le tiroir, remettre l\'argent.', sections: CAISSIER },
  { id: 'gerant', titre: 'Je gère', qui: 'Gérant : le stock, les livraisons, l\'inventaire, les fournisseurs.', sections: GERANT },
  { id: 'proprietaire', titre: 'Je suis le propriétaire', qui: 'Propriétaire : la carte, l\'équipe, les chiffres, l\'abonnement.', sections: PROPRIETAIRE },
  { id: 'location', titre: 'Chambres, logements, véhicules', qui: 'Locations : séjours, réservations, cautions, baux, véhicules.', sections: [LOCATION] },
  { id: 'commun', titre: 'Pour tout le monde', qui: 'Se connecter, et que faire quand le réseau coupe.', sections: COMMUN },
];

const section = (rid, s) => {
  const k = `${rid}-${cle(s.titre)}`;
  const image = existsSync(join(racine, 'img', 'guide', `${k}.webp`))
    ? `<div class="telephone petit"><img src="../img/guide/${k}.webp" alt="${echapper(s.titre)}" loading="lazy" width="540" height="1200" /></div>` : '';
  const texte = `<h3 id="${k}">${echapper(s.titre)}</h3><ul>${s.points.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul>`;
  return image ? `<div class="pas"><div>${texte}</div>${image}</div>` : texte;
};

const debuts = Object.entries({
  restauration: 'Maquis, restaurant', boutique: 'Boutique', marche: 'Marché', vente_directe: 'Vente directe',
}).map(([t, nom]) => `<li><b>${nom} :</b> ${echapper(DEBUT_COMMANDE[t])}</li>`).join('');

const corps = ROLES.map((r) => `
  <h2 id="${r.id}">${echapper(r.titre)}</h2>
  <p class="chapeau" style="font-size:17px">${echapper(r.qui)}</p>
  ${r.id === 'vendeur' ? `<div class="alerte"><b>Au début d'une commande</b>, cela dépend de votre commerce :<ul style="margin:8px 0 0">${debuts}</ul></div>` : ''}
  ${r.sections.map((s) => section(r.id, s)).join('\n')}`).join('\n');

const sommaire = ROLES.map((r) => `<a href="#${r.id}">${echapper(r.titre)}</a>`).join('');

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Guide d'utilisation — Mon Djê</title>
  <meta name="description" content="Le guide d'utilisation de Mon Djê, rôle par rôle : vendre, tenir la caisse, gérer le stock, suivre ses chiffres, louer des chambres et des véhicules." />
  <meta name="theme-color" content="#0e1b2e" />
  <link rel="canonical" href="https://mondje.ci/guide/" />
  <link rel="icon" href="../favicon.png" />
  <link rel="stylesheet" href="../site.css" />
</head>
<body>
<header class="entete">
  <div class="conteneur">
    <a class="marque" href="../"><img src="../logo-mondje.png" alt="" width="38" height="38" /> Mon Djê</a>
    <nav class="nav"><a href="../#ecrans">L'application</a><a href="../#faq">Questions</a><a class="bouton petit" href="../telecharger/">Télécharger</a></nav>
  </div>
</header>
<main class="page">
  <div class="conteneur contenu">
    <span class="surtitre">Guide d'utilisation</span>
    <h1>Mon Djê, rôle par rôle.</h1>
    <p class="chapeau">Chacun ne lit que ce qui le concerne : le personnel tourne beaucoup, et personne ne lira trois pages avant un vendredi soir.
      Ce guide est le même que celui de l'application (Profil → Comment utiliser Mon Djê).</p>
    <div class="sommaire">${sommaire}</div>
    ${corps}
    <div class="alerte"><b>Une question ?</b> Écrivez-nous sur <a href="https://wa.me/2250565750303">WhatsApp au 05 65 75 03 03</a>
      ou depuis l'application (« Assistance Mon Djê »).</div>
  </div>
</main>
<footer class="pied"><div class="conteneur"><div class="bas" style="border:0;margin:0;padding:0">© 2026 Mon Djê · <a href="../">Accueil</a> · <a href="../telecharger/">Télécharger</a> · <a href="../apropos/">À propos</a> · <a href="../equipe/">Espace équipe</a></div></div></footer>
</body>
</html>
`;
writeFileSync(join(ici, 'index.html'), html);
console.log(`guide/index.html : ${ROLES.reduce((n, r) => n + r.sections.length, 0)} rubriques`);

// --- Qui est derrière Mon Djê : la page /apropos/ et le fragment que reprend la page publique des commerces ---
const credits = `<div class="credits">
  <p class="credit-auteur"><span>${echapper(AUTEUR.role)}</span> <b>${echapper(AUTEUR.nom)}</b></p>
  ${STRUCTURES.map((st) => `<details>
    <summary><b>${echapper(st.nom)}</b><small>${echapper(st.role)}</small></summary>
    <p>${echapper(st.resume)}</p>
    ${st.rubriques.map((r) => `<h4>${echapper(r.titre)}</h4><ul>${r.points.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul>`).join('')}
  </details>`).join('\n  ')}
</div>`;
mkdirSync(join(racine, 'apropos'), { recursive: true });
writeFileSync(join(racine, 'apropos', 'credits.html'), credits + '\n');
writeFileSync(join(racine, 'apropos', 'index.html'), `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>À propos — Mon Djê</title>
  <meta name="description" content="Qui est derrière Mon Djê : son auteur, ses copropriétaires et la collaboration de Claude Code (Anthropic)." />
  <meta name="theme-color" content="#0e1b2e" />
  <link rel="canonical" href="${SITE_WEB_URL}/apropos/" />
  <link rel="icon" href="../favicon.png" />
  <link rel="stylesheet" href="../site.css" />
</head>
<body>
<header class="entete">
  <div class="conteneur">
    <a class="marque" href="../"><img src="../logo-mondje.png" alt="" width="38" height="38" /> Mon Djê</a>
    <nav class="nav"><a href="../guide/">Guide</a><a href="../#faq">Questions</a><a class="bouton petit" href="../telecharger/">Télécharger</a></nav>
  </div>
</header>
<main class="page">
  <div class="conteneur contenu">
    <span class="surtitre">À propos</span>
    <h1>Qui est derrière Mon Djê ?</h1>
    <p class="chapeau">Mon Djê est une idée ivoirienne, pensée pour les commerces d'ici. Touchez une structure pour la découvrir.</p>
    ${credits}
    <p style="margin-top:30px"><a class="bouton clair" href="${SITE_WEB_URL}">${SITE_WEB}</a></p>
  </div>
</main>
<footer class="pied"><div class="conteneur"><div class="bas" style="border:0;margin:0;padding:0">© 2026 Mon Djê · <a href="../">Accueil</a> · <a href="../guide/">Guide</a> · <a href="../telecharger/">Télécharger</a></div></div></footer>
</body>
</html>
`);
console.log('apropos/index.html et apropos/credits.html');
