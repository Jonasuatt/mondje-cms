// Construit « Mon-Dje-guide-illustre.docx » à partir de plan.json (voir plan.py) et des JPEG réduits.
//
//   python cms/guide/document/plan.py
//   NODE_PATH=<dossier contenant node_modules/docx> node cms/guide/document/construire.js
//   python cms/guide/document/signets.py   (docx-js numérote tous les signets 1 : on les renumérote)
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType,
  HeadingLevel, Bookmark, InternalHyperlink, Footer, PageNumber, PageBreak, LevelFormat, ShadingType, VerticalAlign,
} = require('docx');

const ICI = __dirname;
const SORTIE = process.argv[2] || path.join('C:', 'Users', 'User', 'Documents', 'Claude', 'Plateforme SaaS Document', '2 - Guides et présentations', 'Mon-Dje-guide-illustre.docx');
const plan = JSON.parse(fs.readFileSync(path.join(ICI, 'plan.json'), 'utf8'));
const logo = fs.readFileSync(path.join(ICI, '..', '..', 'logo-mondje.png'));

const NUIT = '0E1B2E', BLEU = '1A5FA8', ACCENT = 'C98200', GRIS = '5B667A';
const POLICE = 'Calibri';

const texte = (t, o = {}) => new TextRun({ text: t, font: POLICE, ...o });
const para = (t, o = {}, opts = {}) => new Paragraph({ children: Array.isArray(t) ? t : [texte(t, opts)], spacing: { after: 120 }, ...o });
const puce = (t) => new Paragraph({ numbering: { reference: 'puces', level: 0 }, children: [texte(t, { size: 22 })], spacing: { after: 60 } });

// ----- Couverture ----------------------------------------------------------------------------------------------
const couverture = [
  new Paragraph({ spacing: { before: 1800 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 150, height: 150 }, altText: { title: 'Logo', description: 'Logo Mon Djê', name: 'logo' } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 80 }, children: [texte('Mon Djê', { size: 96, bold: true, color: NUIT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [texte('Guide illustré de l’application', { size: 44, color: BLEU })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [texte('La caisse et le stock des commerces de Côte d’Ivoire', { size: 28, color: GRIS, italics: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900, after: 60 }, children: [texte('Maquis et restaurants · Boutiques · Marchés · Ventes directes · Locations', { size: 24, color: NUIT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1400 }, children: [texte('Version 1.0.0 — octobre 2026', { size: 24, color: GRIS })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [texte('mondje.ci', { size: 24, color: BLEU, bold: true })] }),
];

// ----- Mentions ------------------------------------------------------------------------------------------------
const titreMention = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 120 }, children: [texte(t, { size: 28, bold: true, color: NUIT })] });
const ligneCredit = (role, nom) => new Paragraph({
  spacing: { after: 140 },
  children: [texte(role + ' ', { size: 24, color: GRIS }), texte(nom, { size: 24, bold: true, color: NUIT })],
});

const mentions = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [texte('Crédits', { size: 40, bold: true, color: NUIT })] }),
  ligneCredit('Idée et mise en œuvre de l’application :', 'Ouattara Nogolourgo Jonas'),
  titreMention('Copropriétaires de Mon Djê'),
  puce('SFP Sans Frontière Properties, LLC'),
  puce('ONG Africa Global International (ONG AGI)'),
  titreMention('Collaboration'),
  puce('Claude Code (Anthropic), pour le développement de l’application'),
  para([texte('Le détail de chaque structure se déplie dans l’application (Profil → À propos de Mon Djê) et sur ', { size: 22, color: GRIS }), texte('mondje.ci/apropos', { size: 22, bold: true, color: BLEU }), texte('.', { size: 22, color: GRIS })], { spacing: { before: 240, after: 120 } }),
  para([texte('Site : ', { size: 24, color: GRIS }), texte('mondje.ci', { size: 24, bold: true, color: BLEU })]),
];

// ----- Mode d'emploi du guide ---------------------------------------------------------------------------------------
const lecture = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [texte('Comment lire ce guide', { size: 40, bold: true, color: NUIT })] }),
  para('Ce guide montre l’application Mon Djê écran par écran. Chaque chapitre suit un commerce de démonstration, aux données fictives mais réalistes, qui illustre un type d’activité :', {}, { size: 22 }),
  ...[
    'Maquis et restaurant : le chapitre le plus complet, qui présente presque toutes les fonctions.',
    'Boutique : vente au détail, import de produits, crédits clients.',
    'Marché : vente par tas, sachet et kilo.',
    'Vente directe : articles à l’unité, paiements mobiles.',
    'Location : chambres, séjours, réservations, cautions, baux mensuels.',
    'La page publique : ce que voit un client qui ouvre le lien d’un commerce, sans compte.',
  ].map(puce),
  para('Les écrans sont ceux d’un propriétaire, qui voit tout. Un vendeur ne voit que la vente et son historique ; un caissier, la caisse ; un gérant, le stock et les livraisons.', { spacing: { before: 160, after: 120 } }, { size: 22 }),
  para('Les noms, les montants et les téléphones sont inventés : ils servent à montrer comment l’application se comporte avec une activité réelle. Seule exception : le dernier chapitre montre la page publique réelle d’un commerce, La Caverne.', {}, { size: 22 }),
];

// ----- Chapitres ----------------------------------------------------------------------------------------------------
const LARGE = 3402, IMG_L = 190, IMG_H = Math.round(190 * 1200 / 540);
const sansBord = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const bords = { top: sansBord, bottom: sansBord, left: sansBord, right: sansBord };

function cellule(item, titreSection) {
  if (!item) return new TableCell({ width: { size: LARGE, type: WidthType.DXA }, borders: bords, children: [new Paragraph({ children: [] })] });
  const enfants = [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [new ImageRun({
        type: 'jpg', data: fs.readFileSync(item.fichier), transformation: { width: IMG_L, height: IMG_H },
        altText: { title: titreSection, description: item.legende || titreSection, name: path.basename(item.fichier) },
      })],
    }),
  ];
  if (item.legende) {
    enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [texte(item.legende, { size: 17, color: GRIS, italics: true })] }));
  }
  return new TableCell({
    width: { size: LARGE, type: WidthType.DXA }, borders: bords, verticalAlign: VerticalAlign.TOP,
    margins: { top: 40, bottom: 40, left: 90, right: 90 }, children: enfants,
  });
}

function grille(items, titreSection) {
  const rangs = [];
  for (let i = 0; i < items.length; i += 3) {
    const lot = items.slice(i, i + 3);
    rangs.push(new TableRow({
      cantSplit: true,
      children: [0, 1, 2].map((k) => cellule(lot[k], titreSection)),
    }));
  }
  return new Table({ width: { size: LARGE * 3, type: WidthType.DXA }, columnWidths: [LARGE, LARGE, LARGE], borders: { ...bords, insideHorizontal: sansBord, insideVertical: sansBord }, rows: rangs });
}

const chapitres = [];
const sommaire = [new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [texte('Sommaire', { size: 40, bold: true, color: NUIT })] })];
const lien = (ancre, t, o) => new Paragraph({ spacing: { after: o.apres ?? 40 }, indent: { left: o.retrait ?? 0 }, children: [new InternalHyperlink({ anchor: ancre, children: [texte(t, { size: o.taille, bold: o.gras, color: o.couleur })] })] });
plan.forEach((c, n) => {
  sommaire.push(lien(`c${n}`, `${n + 1}. ${c.titre} — ${c.commerce.split(' (')[0]}`, { taille: 24, gras: true, couleur: NUIT, apres: 60, retrait: 0 }));
  c.sections.filter((s) => s.items.length).forEach((s, k) => sommaire.push(lien(`s${n}_${k}`, s.titre, { taille: 20, gras: false, couleur: BLEU, retrait: 360 })));
  if (n < plan.length - 1) sommaire.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
});
plan.forEach((c, n) => {
  chapitres.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new Bookmark({ id: `c${n}`, children: [texte(`${n + 1}. ${c.titre}`, { size: 40, bold: true, color: NUIT })] })] }),
    new Paragraph({ spacing: { after: 120 }, children: [texte(c.commerce, { size: 26, color: BLEU, bold: true })] }),
    new Paragraph({ spacing: { after: 160 }, children: [texte(c.intro, { size: 22, color: GRIS })] }),
  );
  c.sections.filter((s) => s.items.length).forEach((s, k) => {
    chapitres.push(new Paragraph({
      heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 240, after: 100 },
      children: [new Bookmark({ id: `s${n}_${k}`, children: [texte(s.titre, { size: 28, bold: true, color: ACCENT })] })],
    }));
    chapitres.push(grille(s.items, s.titre));
  });
});

const pied = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [texte('Mon Djê — guide illustré · page ', { size: 16, color: GRIS }), new TextRun({ children: [PageNumber.CURRENT], font: POLICE, size: 16, color: GRIS })],
  })],
});

const page = { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 850, bottom: 850, left: 850 } };

const doc = new Document({
  creator: 'Mon Djê', title: 'Mon Djê — Guide illustré de l’application', description: 'Toutes les fonctions de l’application, écran par écran',
  styles: {
    default: { document: { run: { font: POLICE, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 40, bold: true, color: NUIT, font: POLICE }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: ACCENT, font: POLICE }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'puces', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [
    { properties: { page }, children: couverture },
    { properties: { page }, footers: { default: pied }, children: [...mentions, ...lecture, ...sommaire, ...chapitres] },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(SORTIE, buf);
  console.log('écrit :', SORTIE, (buf.length / 1e6).toFixed(1), 'Mo');
});
