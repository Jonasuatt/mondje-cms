// Un lien « mailto: » n'ouvre rien quand l'ordinateur n'a pas de messagerie réglée (cas courant : on utilise Gmail dans le navigateur).
// Si la page n'a pas perdu le focus dans la seconde qui suit le clic, on copie l'adresse et on propose Gmail.
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href^="mailto:"]');
  if (!a) return;
  const adresse = a.getAttribute('href').slice(7).split('?')[0];
  let parti = false;
  const marque = () => { parti = true; };
  window.addEventListener('blur', marque, { once: true });
  document.addEventListener('visibilitychange', marque, { once: true });
  setTimeout(() => {
    window.removeEventListener('blur', marque);
    if (parti) return;
    try { navigator.clipboard.writeText(adresse); } catch { /* copie impossible : l'adresse reste affichée */ }
    document.querySelector('.mail-aide')?.remove();
    const m = document.createElement('div');
    m.className = 'mail-aide';
    m.setAttribute('role', 'status');
    m.innerHTML = `Votre messagerie ne s'est pas ouverte. L'adresse <b>${adresse}</b> est copiée : collez-la dans votre mail, ou <a target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(adresse)}">écrivez avec Gmail</a>.`;
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 12000);
  }, 1200);
});
