// Le compteur de visites de mondje.ci. Ni cookie, ni adresse IP, ni identifiant : voir supabase/migrations/20261003090000_visites_du_site.sql.
// Ne comptent pas : les robots, les aperçus (?apercu), et le site ouvert depuis un ordinateur de développement.
(() => {
  const robot = navigator.webdriver || /bot|crawl|spider|preview|headless|lighthouse/i.test(navigator.userAgent);
  const p = new URLSearchParams(location.search);
  if (robot || p.has('apercu') || /^(localhost|127\.|\[::1\])/.test(location.hostname) || location.protocol === 'file:') return;

  // /guide/index.html -> /guide/ ; la page d'accueil -> /
  const page = location.pathname.replace(/index\.html$/, '').replace(/\.html$/, '').toLowerCase() || '/';

  // La provenance : ce que porte le lien partagé (?s=facebook), sinon le site d'où l'on vient.
  let origine = (p.get('s') || p.get('utm_source') || '').toLowerCase().trim();
  if (!origine && document.referrer) {
    try {
      const h = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (h && h !== location.hostname.replace(/^www\./, '')) origine = h;
    } catch { /* adresse illisible : « direct » */ }
  }

  // Une visite par onglet : l'onglet retient seulement « déjà compté ».
  let nouvelle = true;
  try {
    nouvelle = !sessionStorage.getItem('mesure_vu');
    sessionStorage.setItem('mesure_vu', '1');
  } catch { /* navigation privée : chaque page compte comme une visite, faute de mieux */ }

  try {
    fetch('https://xflrfpmsatikglixxtxs.supabase.co/rest/v1/rpc/compter_site', {
      method: 'POST',
      keepalive: true,
      headers: { apikey: 'sb_publishable__o--lkXqrhp8MvCruh5aCA_AoBSlLLB', 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_page: page, p_origine: origine, p_nouvelle: nouvelle }),
    }).catch(() => {});
  } catch { /* un compteur ne doit jamais gêner la page */ }
})();
