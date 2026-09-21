# Régénère cms/villes.js à partir de maquis/src/carte.ts, qui reste la seule
# liste tenue à jour. À lancer depuis la racine du dépôt après y avoir ajouté
# une ville :  python cms/regenerer-villes.py
import io

src = io.open('maquis/src/carte.ts', encoding='utf-8').read()
debut = src.index('export const VILLES')
corps = src[debut:src.index('];', debut) + 2].replace(
    'export const VILLES: VilleCarte[] =', 'const VILLES =')

io.open('cms/villes.js', 'w', encoding='utf-8', newline='\n').write(
    """// Positions des villes sur la carte, RECOPIÉES de maquis/src/carte.ts.
// Une seule liste tenue à jour, celle de l'application ; ce fichier est
// régénéré à partir d'elle : python cms/regenerer-villes.py

""" + corps + """

const normaliser = (v) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z]/g, '');

const INDEX_VILLES = new Map(VILLES.map((v) => [normaliser(v.nom), v]));

const trouverVille = (nom) => {
  if (!nom) return undefined;
  const clef = normaliser(nom);
  return INDEX_VILLES.get(clef) ?? VILLES.find((v) => clef.startsWith(normaliser(v.nom)));
};
""")
print('cms/villes.js régénéré')
