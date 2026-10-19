// Un classeur Excel (.xlsx) écrit à la main : un .xlsx est un dossier zippé de fichiers XML, et un zip « sans compression » tient en quelques lignes.
// Pas de bibliothèque à livrer ni à mettre à jour (voir LISEZ-MOI.md : le CMS n'a aucune chaîne de compilation).
//
//   construireXlsx([{ nom: 'Catalogue', largeurs: [30, 12], lignes: [['Produit', 'Unité'], ['Castel', 'bouteille']] }])  →  Blob
//
// La première ligne de chaque feuille est l'en-tête : en gras, figée, avec filtre. Les nombres restent des nombres, le reste est du texte.
(function (racine) {
  const enc = new TextEncoder();

  const TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (o) => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < o.length; i++) c = TABLE[(c ^ o[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  // Le zip : chaque fichier stocké tel quel (méthode 0), noms en UTF-8, date fixe (1er janvier 1980).
  function zip(fichiers) {
    const morceaux = [];
    const centrale = [];
    let pos = 0;
    for (const f of fichiers) {
      const nom = enc.encode(f.nom);
      const crc = crc32(f.donnees);
      const n = f.donnees.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, n, true); lh.setUint32(22, n, true);
      lh.setUint16(26, nom.length, true);
      morceaux.push(new Uint8Array(lh.buffer), nom, f.donnees);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, n, true); ch.setUint32(24, n, true);
      ch.setUint16(28, nom.length, true); ch.setUint32(42, pos, true);
      centrale.push(new Uint8Array(ch.buffer), nom);
      pos += 30 + nom.length + n;
    }
    const tailleCentrale = centrale.reduce((s, m) => s + m.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, tailleCentrale, true); fin.setUint32(16, pos, true);
    const tout = [...morceaux, ...centrale, new Uint8Array(fin.buffer)];
    const sortie = new Uint8Array(tout.reduce((s, m) => s + m.length, 0));
    let p = 0;
    for (const m of tout) { sortie.set(m, p); p += m.length; }
    return sortie;
  }

  const xml = (v) => String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lettre = (i) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

  function feuille(f) {
    const nbCol = Math.max(1, ...f.lignes.map((l) => l.length));
    const lignes = f.lignes.map((l, r) => {
      const cellules = l.map((v, c) => {
        const ref = lettre(c) + (r + 1);
        const style = r === 0 ? ' s="1"' : '';
        if (v === null || v === undefined || v === '') return '';
        if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
        return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
      }).join('');
      return `<row r="${r + 1}">${cellules}</row>`;
    }).join('');
    const cols = (f.largeurs ?? []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      + (cols ? `<cols>${cols}</cols>` : '')
      + `<sheetData>${lignes}</sheetData>`
      + `<autoFilter ref="A1:${lettre(nbCol - 1)}${Math.max(1, f.lignes.length)}"/>`
      + '</worksheet>';
  }

  function construireOctets(feuilles) {
    const e = (s) => enc.encode(s);
    const n = feuilles.length;
    const fichiers = [
      { nom: '[Content_Types].xml', donnees: e('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + feuilles.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
        + '</Types>') },
      { nom: '_rels/.rels', donnees: e('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { nom: 'xl/workbook.xml', donnees: e('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
        + feuilles.map((f, i) => `<sheet name="${xml(f.nom.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>') },
      { nom: 'xl/_rels/workbook.xml.rels', donnees: e('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + feuilles.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
        + `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
      { nom: 'xl/styles.xml', donnees: e('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
        + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill></fills>'
        + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
        + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
        + '</styleSheet>') },
      ...feuilles.map((f, i) => ({ nom: `xl/worksheets/sheet${i + 1}.xml`, donnees: e(feuille(f)) })),
    ];
    return zip(fichiers);
  }

  const construireXlsx = (feuilles) =>
    new Blob([construireOctets(feuilles)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  racine.construireXlsx = construireXlsx;
  racine.construireXlsxOctets = construireOctets;
  if (typeof module !== 'undefined') module.exports = { construireXlsx, construireOctets };
})(typeof window !== 'undefined' ? window : globalThis);
