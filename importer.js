// Importer une liste de produits (et leur stock de départ) depuis un fichier CSV.
//
// Un commerçant qui ouvre son compte a déjà sa liste — dans un cahier recopié sur Excel. Tout ressaisir
// au pouce, produit par produit, est ce qui fait abandonner. Excel enregistre en CSV (« Fichier >
// Enregistrer sous > CSV »). Ce module lit ce texte, dit ligne par ligne ce qui passe et pourquoi le
// reste est refusé, et ne fait rien d'autre : l'écriture se fait ailleurs, après que le propriétaire a
// vu le compte rendu.
//
// À part, sans rien importer, pour être testable (voir test/importer.test.mjs).
export const MAX_LIGNES = 500;
export const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// Deux noms qui ne diffèrent que par la casse, les accents ou les espaces sont le même produit.
export const cleNom = sansAccent;
const cle = (s) => sansAccent(s).replace(/[^a-z0-9]/g, '');
const COLONNES = {
    nom: ['nom', 'produit', 'article', 'designation', 'libelle'],
    unite: ['unite', 'unit'],
    prixVente: ['prixdevente', 'prixvente', 'pv', 'prix', 'tarif', 'prixttc'],
    prixAchat: ['prixdachat', 'prixachat', 'pa', 'cout', 'coutdachat'],
    stock: ['stock', 'quantite', 'qte', 'enstock', 'stockinitial', 'stockdedepart'],
};
// Excel en français enregistre « CSV (séparateur : point-virgule) » en Windows-1252, pas en UTF-8 : lu comme de
// l'UTF-8, « Bière » devient « Bi�re ». Si le texte lu en UTF-8 contient le caractère de remplacement, on relit les
// octets en Windows-1252 (latin-1 plus la plage 0x80–0x9F).
const CP1252 = {
    0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹',
    0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™',
    0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};
export function decoderAnsi(octets) {
    let t = '';
    for (let i = 0; i < octets.length; i++)
        t += CP1252[octets[i]] ?? String.fromCharCode(octets[i]);
    return t;
}
export const aDesCaracteresAbimes = (texte) => texte.includes('�');
// Un nombre comme on l'écrit chez soi : « 1 500 », « 1.500 », « 1,5 », « 2000 F ».
export function lireNombre(brut) {
    const t = (brut ?? '').replace(/[^\d.,-]/g, '');
    if (!/\d/.test(t))
        return null;
    // Trois chiffres après le séparateur : c'est un séparateur de milliers, pas une décimale.
    const n = /^-?\d{1,3}([.,]\d{3})+$/.test(t) ? Number(t.replace(/[.,]/g, '')) : Number(t.replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n) : null;
}
// Découpe une ligne CSV en respectant les guillemets (un nom peut contenir le séparateur).
export function decouper(ligne, sep) {
    const cellules = [];
    let courante = '';
    let entre = false;
    for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (entre) {
            if (c === '"' && ligne[i + 1] === '"') {
                courante += '"';
                i++;
            }
            else if (c === '"')
                entre = false;
            else
                courante += c;
        }
        else if (c === '"')
            entre = true;
        else if (c === sep) {
            cellules.push(courante.trim());
            courante = '';
        }
        else
            courante += c;
    }
    cellules.push(courante.trim());
    return cellules;
}
const separateur = (ligne) => {
    const compte = (c) => ligne.split(c).length - 1;
    const choix = [';', '\t', ','].map((c) => [c, compte(c)]).sort((a, b) => b[1] - a[1])[0];
    return choix[1] > 0 ? choix[0] : ';';
};
export function analyserImport(texte, existants = []) {
    const vide = { valides: [], refus: [], entetes: false, tropLong: false, illisible: null };
    const lignes = texte.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (!lignes.length)
        return { ...vide, illisible: 'Le fichier est vide.' };
    const sep = separateur(lignes[0]);
    const premiere = decouper(lignes[0], sep).map(cle);
    const trouve = (nom) => premiere.findIndex((c) => COLONNES[nom].includes(c));
    // Avec des en-têtes, chaque colonne est reconnue par son nom ; sans, on suppose nom ; prix de vente ; stock.
    const entetes = trouve('nom') >= 0;
    const pos = entetes
        ? { nom: trouve('nom'), unite: trouve('unite'), prixVente: trouve('prixVente'), prixAchat: trouve('prixAchat'), stock: trouve('stock') }
        : { nom: 0, unite: -1, prixVente: 1, prixAchat: -1, stock: 2 };
    if (entetes && pos.prixVente < 0) {
        return { ...vide, entetes, illisible: 'Il manque la colonne du prix de vente (« Prix de vente »).' };
    }
    if (!entetes && lireNombre(decouper(lignes[0], sep)[1]) === null) {
        return { ...vide, illisible: 'Première ligne non reconnue : mets des en-têtes (Nom ; Prix de vente ; Stock…) ou prends le modèle.' };
    }
    const vus = new Set(existants.map(cleNom));
    const corps = lignes.slice(entetes ? 1 : 0);
    const analyse = { ...vide, entetes, tropLong: corps.length > MAX_LIGNES };
    corps.slice(0, MAX_LIGNES).forEach((brut, i) => {
        const numero = i + 1 + (entetes ? 1 : 0);
        const c = decouper(brut, sep);
        const nom = (c[pos.nom] ?? '').replace(/\s+/g, ' ').trim();
        const refuse = (raison) => analyse.refus.push({ ligne: numero, nom, raison });
        if (nom.length < 2)
            return refuse('nom manquant ou trop court');
        if (nom.length > 80)
            return refuse('nom trop long (80 caractères au plus)');
        const prixVente = lireNombre(c[pos.prixVente]);
        if (prixVente === null || prixVente <= 0)
            return refuse('prix de vente manquant ou invalide (il doit être supérieur à 0)');
        if (prixVente > 10000000)
            return refuse('prix de vente invraisemblable');
        const prixAchat = pos.prixAchat >= 0 ? lireNombre(c[pos.prixAchat]) : null;
        if (prixAchat !== null && (prixAchat < 0 || prixAchat > 10000000))
            return refuse('prix d’achat invraisemblable');
        const stock = pos.stock >= 0 ? (lireNombre(c[pos.stock]) ?? 0) : 0;
        if (stock < 0 || stock > 1000000)
            return refuse('stock invraisemblable');
        const k = cleNom(nom);
        if (vus.has(k))
            return refuse('ce produit existe déjà (ou est en double dans le fichier)');
        vus.add(k);
        const unite = pos.unite >= 0 ? (c[pos.unite] ?? '').trim().toLowerCase().slice(0, 20) : '';
        analyse.valides.push({ ligne: numero, nom, unite: unite || 'pièce', prixVente, prixAchat, stock });
    });
    return analyse;
}
// Le fichier modèle que le propriétaire remplit dans Excel.
export const MODELE_IMPORT = {
    entetes: ['Nom', 'Unité', 'Prix de vente', 'Prix d’achat', 'Stock'],
    lignes: [
        ['Castel Beer 33 cl', 'bouteille', 700, 450, 24],
        ['Riz parfumé 5 kg', 'sac', 4500, 3800, 10],
    ],
};
