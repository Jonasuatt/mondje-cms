// Les sources de l'application importent sans extension (« ./facture ») : Node veut « ./facture.ts ». Ce petit
// résolveur ajoute l'extension quand le module est introuvable, le temps de générer le guide.
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, suivant) {
  try { return await suivant(spec, ctx); }
  catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' && spec.startsWith('.')) return suivant(spec + '.ts', ctx);
    throw e;
  }
}`));
