// Partager une information du site : chaque section, chaque question, chaque vidéo reçoit un bouton « Partager ».
// Sur téléphone, le partage du système s'ouvre (WhatsApp, Facebook, Messenger… tout ce qui est installé) ; sur ordinateur, un petit menu.
// Le lien porte son ancre (#...) et la provenance (?s=whatsapp) que le compteur de visites lit.
(() => {
  const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  const pris = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
  const idDe = (el, titre) => {
    if (el.id) return el.id;
    let base = 'p-' + slug(titre) || 'partie', id = base, n = 2;
    while (pris.has(id)) id = base + '-' + n++;
    pris.add(id); el.id = id; return id;
  };
  const lien = (id, source) => {
    const u = new URL(location.href);
    u.hash = id; u.search = source ? '?s=' + source : '';
    return u.toString();
  };
  const RESEAUX = [
    ['whatsapp', 'WhatsApp', (u, t) => 'https://wa.me/?text=' + encodeURIComponent(t + ' ' + u)],
    ['facebook', 'Facebook', (u) => 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u)],
    ['x', 'X', (u, t) => 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(t) + '&url=' + encodeURIComponent(u)],
    ['telegram', 'Telegram', (u, t) => 'https://t.me/share/url?url=' + encodeURIComponent(u) + '&text=' + encodeURIComponent(t)],
    ['linkedin', 'LinkedIn', (u) => 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(u)],
  ];
  let menu;
  const fermer = () => { menu?.remove(); menu = null; };
  document.addEventListener('click', (e) => { if (menu && !menu.contains(e.target) && !e.target.closest('.partager')) fermer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermer(); });

  const ouvrir = async (bouton, id, titre) => {
    const texte = titre + ' — Mon Djê';
    if (navigator.share && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) {
      try { await navigator.share({ title: texte, text: texte, url: lien(id, '') }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    fermer();
    menu = document.createElement('div');
    menu.className = 'partager-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = RESEAUX.map(([c, n, f]) => `<a role="menuitem" target="_blank" rel="noopener" href="${f(lien(id, c), texte)}">${n}</a>`).join('') + '<button type="button" role="menuitem">Copier le lien</button>';
    menu.querySelector('button').onclick = async () => {
      try { await navigator.clipboard.writeText(lien(id, '')); menu.querySelector('button').textContent = 'Lien copié ✓'; } catch { menu.querySelector('button').textContent = lien(id, ''); }
      setTimeout(fermer, 1600);
    };
    document.body.appendChild(menu);
    const r = bouton.getBoundingClientRect();
    menu.style.top = window.scrollY + r.bottom + 6 + 'px';
    menu.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - 200)) + 'px';
  };

  const ajouter = (cible, titre, apres) => {
    if (!cible || !titre || cible.querySelector(':scope > .partager, :scope > * > .partager')) return;
    const id = idDe(cible, titre);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'partager'; b.textContent = '↗ Partager'; b.setAttribute('aria-label', 'Partager : ' + titre);
    b.onclick = () => ouvrir(b, id, titre);
    (apres || cible).appendChild(b);
  };

  document.querySelectorAll('section[id] h2').forEach((h) => { const s = h.closest('section'); const id = s.id; if (id === 'faq') return; h.insertAdjacentElement('afterend', Object.assign(document.createElement('div'), { className: 'partager-rang' })); const rang = h.nextElementSibling; const b = document.createElement('button'); b.type = 'button'; b.className = 'partager'; b.textContent = '↗ Partager'; b.setAttribute('aria-label', 'Partager : ' + h.textContent.trim()); b.onclick = () => ouvrir(b, id, h.textContent.trim()); rang.appendChild(b); });
  document.querySelectorAll('h2[id]:not(section h2)').forEach((h) => { const rang = Object.assign(document.createElement('div'), { className: 'partager-rang' }); h.insertAdjacentElement('afterend', rang); const b = document.createElement('button'); b.type = 'button'; b.className = 'partager'; b.textContent = '↗ Partager'; b.onclick = () => ouvrir(b, h.id, h.textContent.trim()); rang.appendChild(b); });
  document.querySelectorAll('.faq details').forEach((d) => { const q = d.querySelector('summary')?.textContent.trim(); const id = idDe(d, q || 'question'); const b = document.createElement('button'); b.type = 'button'; b.className = 'partager'; b.textContent = '↗ Partager'; b.setAttribute('aria-label', 'Partager : ' + q); b.onclick = () => ouvrir(b, id, q); d.appendChild(b); });
  document.querySelectorAll('.demo').forEach((d) => ajouter(d, d.querySelector('h3')?.textContent.trim()));

  // Un lien partagé vers une question ouvre cette question.
  const ouvrirAncre = () => { const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el && el.tagName === 'DETAILS') el.open = true; };
  ouvrirAncre(); window.addEventListener('hashchange', ouvrirAncre);
})();
