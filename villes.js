// Positions des villes sur la carte, RECOPIÉES de maquis/src/carte.ts.
// Une seule liste tenue à jour, celle de l'application ; ce fichier est
// régénéré à partir d'elle (script dans le dépôt, cms/regenerer-villes.py).

const VILLES = [
  { nom: 'Abidjan', x: 0.729, y: 0.846 },
  { nom: 'Yamoussoukro', x: 0.524, y: 0.593 },
  { nom: 'Bouaké', x: 0.598, y: 0.440 },
  { nom: 'Korhogo', x: 0.442, y: 0.206 },
  { nom: 'San-Pédro', x: 0.292, y: 0.895 },
  { nom: 'Daloa', x: 0.340, y: 0.605 },
  { nom: 'Man', x: 0.143, y: 0.523 },
  { nom: 'Gagnoa', x: 0.403, y: 0.694 },
  { nom: 'Abengourou', x: 0.822, y: 0.620 },
  { nom: 'Divo', x: 0.530, y: 0.729 },
  { nom: 'Odienné', x: 0.168, y: 0.202 },
  { nom: 'Séguéla', x: 0.293, y: 0.408 },
  { nom: 'Bondoukou', x: 0.906, y: 0.373 },
  { nom: 'Dabou', x: 0.648, y: 0.846 },
  { nom: 'Grand-Bassam', x: 0.810, y: 0.845 },
  { nom: 'Aboisso', x: 0.886, y: 0.785 },
  { nom: 'Soubré', x: 0.333, y: 0.758 },
  { nom: 'Bouaflé', x: 0.443, y: 0.580 },
  { nom: 'Katiola', x: 0.564, y: 0.400 },
  { nom: 'Ferkessédougou', x: 0.559, y: 0.153 },
  { nom: 'Agboville', x: 0.697, y: 0.713 },
  { nom: 'Adzopé', x: 0.757, y: 0.735 },
  { nom: 'Dimbokro', x: 0.619, y: 0.624 },
  { nom: 'Toumodi', x: 0.557, y: 0.638 },
  { nom: 'Sassandra', x: 0.403, y: 0.878 },
  { nom: 'Tabou', x: 0.191, y: 0.895 },
  { nom: 'Duékoué', x: 0.215, y: 0.608 },
  { nom: 'Guiglo', x: 0.167, y: 0.645 },
  { nom: 'Bouna', x: 0.891, y: 0.234 },
  { nom: 'Boundiali', x: 0.334, y: 0.219 },
  { nom: 'Touba', x: 0.215, y: 0.398 },
  { nom: 'Danané', x: 0.068, y: 0.523 },
  { nom: 'Issia', x: 0.330, y: 0.653 },
  { nom: 'Lakota', x: 0.457, y: 0.750 },
  { nom: 'Tiassalé', x: 0.610, y: 0.725 },
  { nom: 'Bingerville', x: 0.752, y: 0.850 },
  { nom: 'Anyama', x: 0.729, y: 0.828 },
  { nom: 'Bonoua', x: 0.828, y: 0.828 },
  { nom: 'Séguélon', x: 0.240, y: 0.228 },
  { nom: 'Tengréla', x: 0.340, y: 0.042 },
  { nom: 'Sinfra', x: 0.452, y: 0.630 },
  { nom: 'Oumé', x: 0.490, y: 0.670 },
  { nom: 'Bongouanou', x: 0.700, y: 0.628 },
  { nom: 'Agnibilékrou', x: 0.855, y: 0.560 },
  { nom: 'Biankouma', x: 0.160, y: 0.462 },
  { nom: 'Vavoua', x: 0.315, y: 0.492 },
  { nom: 'Mankono', x: 0.410, y: 0.385 },
  { nom: 'Bocanda', x: 0.668, y: 0.588 },
  { nom: 'Daoukro', x: 0.760, y: 0.597 },
  { nom: 'M’Bahiakro', x: 0.700, y: 0.513 },
  { nom: 'Jacqueville', x: 0.660, y: 0.865 },
  { nom: 'Grand-Lahou', x: 0.600, y: 0.855 },
  { nom: 'Méagui', x: 0.290, y: 0.815 },
  { nom: 'Buyo', x: 0.262, y: 0.722 },
  { nom: 'Bloléquin', x: 0.090, y: 0.672 },
  { nom: 'Toulépleu', x: 0.035, y: 0.660 },
  { nom: 'Kani', x: 0.290, y: 0.320 },
  { nom: 'Dabakala', x: 0.672, y: 0.365 },
  { nom: 'Niakaramadougou', x: 0.520, y: 0.318 },
  { nom: 'Dianra', x: 0.372, y: 0.290 },
  { nom: 'Béoumi', x: 0.490, y: 0.443 },
  { nom: 'Sakassou', x: 0.505, y: 0.520 },
  { nom: 'Tiébissou', x: 0.535, y: 0.548 },
  { nom: 'Didiévi', x: 0.590, y: 0.533 },
  { nom: 'Arrah', x: 0.745, y: 0.618 },
  { nom: 'Akoupé', x: 0.745, y: 0.660 },
  { nom: 'Alépé', x: 0.790, y: 0.795 },
  { nom: 'Adiaké', x: 0.895, y: 0.855 },
  { nom: 'Guitry', x: 0.545, y: 0.812 },
  { nom: 'Fresco', x: 0.480, y: 0.840 },
  { nom: 'Tanda', x: 0.855, y: 0.455 },
  { nom: 'Kouto', x: 0.330, y: 0.128 },
  { nom: 'Minignan', x: 0.120, y: 0.105 },
];

const normaliser = (v) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z]/g, '');

const INDEX_VILLES = new Map(VILLES.map((v) => [normaliser(v.nom), v]));

const trouverVille = (nom) => {
  if (!nom) return undefined;
  const clef = normaliser(nom);
  return INDEX_VILLES.get(clef) ?? VILLES.find((v) => clef.startsWith(normaliser(v.nom)));
};
