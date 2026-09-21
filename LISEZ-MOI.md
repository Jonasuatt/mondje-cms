# Espace équipe Mon Djê — version web

Le même espace équipe que dans l'application, sur grand écran : demandes
d'ouverture, commerces, abonnements, catalogue, produits proposés, messages,
journal des interventions, comptes de l'équipe.

Ce qu'il apporte par rapport au téléphone : **un clavier**. Saisir trois cents
produits au catalogue au pouce n'était pas raisonnable.

## Ouvrir le CMS sur cet ordinateur

Depuis la racine du dépôt :

```bash
npx --yes serve -l 4173 cms
```

Puis ouvrir <http://localhost:4173> dans un navigateur, et se connecter avec un
compte de l'équipe (la même adresse et le même mot de passe que dans
l'application).

## Ce qu'il contient

| Fichier | Rôle |
|---|---|
| `index.html` | la page, et le formulaire de connexion |
| `app.js` | tout le reste : navigation, pages, écritures |
| `style.css` | les couleurs de Mon Djê |
| `villes.js` | positions des villes sur la carte, **régénéré**, ne pas modifier à la main |
| `carte-ci.jpg` | la carte de Côte d'Ivoire, réduite à 180 Ko |
| `vendor/supabase.js` | la bibliothèque Supabase, livrée avec le CMS |

Aucune chaîne de compilation, aucun `node_modules` : des fichiers que le
navigateur ouvre tels quels. C'est volontaire — un outil interne qui demande
une compilation avant chaque correction ne se corrige plus.

La bibliothèque Supabase est **livrée avec le CMS** plutôt que chargée depuis
un CDN : une coupure ou une compromission chez un tiers n'ouvre pas nos
comptes.

## Après avoir ajouté une ville à la carte

Les positions vivent dans `maquis/src/carte.ts`, qui reste la seule liste tenue
à jour. Ensuite, depuis la racine :

```bash
python cms/regenerer-villes.py
```

## Les droits

Le CMS n'a aucun pouvoir propre : il parle à la même base, avec les mêmes
règles. Masquer un bouton ici n'interdit rien, et en afficher un n'autorise
rien — c'est le serveur qui décide, pour le téléphone comme pour le navigateur.

Un compte de commerçant qui se connecterait ici ne verrait rien : la base ne
lui rend aucune ligne. Le CMS le lui dit et le déconnecte.

## En ligne

<https://jonasuatt.github.io/mondje-cms/>

Publié par GitHub Pages depuis le dépôt public `Jonasuatt/mondje-cms`, qui ne
contient que ce dossier. Pour republier après une modification, depuis la
racine du dépôt :

```bash
git subtree push --prefix=cms public main
```

(La première fois : `git remote add public https://github.com/Jonasuatt/mondje-cms.git`.)
Compter une à deux minutes avant que GitHub serve la nouvelle version.

Le code du CMS est donc public. Les données ne le sont pas : la page n'a aucun
pouvoir propre, et ne contient que l'adresse du projet Supabase et la clé
publiable — les deux déjà présentes dans l'APK distribué aux commerçants. Tout
le reste dépend des règles RLS et d'une connexion.

Supabase Storage a été essayé et écarté : il renvoie les fichiers HTML en
`text/plain`, volontairement, pour qu'on n'héberge pas de site chez lui.
