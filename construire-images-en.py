# -*- coding: utf-8 -*-
"""Fabrique les images ANGLAISES du site (cms/img/en/*.webp, cms/img/en/guide/*.webp) à partir des captures prises avec l'application en anglais
(« 2 - Guides et présentations/captures_en/<commerce>/<nom>.png », prises avec outils/revision/cap_en.py). Même mise en forme que construire-images.py.
Le site en anglais (langue.js) prend img/en/… quand il existe, sinon l'image française.

    python cms/construire-images-en.py
"""
import importlib.util, os, sys

ICI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('construire_images', os.path.join(ICI, 'construire-images.py'))
base = importlib.util.module_from_spec(spec); spec.loader.exec_module(base)
base.CAPTURES = base.CAPTURES + '_en'

ACCUEIL = {
    "hero-vendre": "caverne/table-2-order",
    "ecran-vendre": "caverne/new-sale",
    "ecran-paiement": "caverne/take-payment",
    "ecran-caisse": "caverne/register-service",
    "ecran-stock": "caverne/stock",
    "ecran-inventaire": "caverne/stock-count",
    "ecran-ardoises": "caverne/credit-accounts",
    "ecran-bilan": "caverne/summary",
    "ecran-location": "caverne/rental",
}
GUIDE = {
    "vendeur-prendre-une-commande": "caverne/table-2-order",
    "vendeur-encaisser": "caverne/take-payment",
    "vendeur-annuler": "caverne/cancel-request",
    "caisse-ouvrir-la-caisse": "caverne/register-open-amount",
    "caisse-pendant-le-service": "caverne/register-service",
    "caisse-fermer-la-caisse": "caverne/register-close-discrepancy",
    "gerant-la-carte": "caverne/menu-and-stock",
    "gerant-le-stock": "caverne/stock",
    "gerant-l-inventaire": "caverne/stock-count",
    "gerant-les-fournisseurs": "caverne/suppliers",
    "gerant-la-tresorerie": "caverne/cash-position",
    "proprietaire-ton-personnel": "caverne/staff",
    "proprietaire-ce-que-tu-dois-regarder-chaque-soir": "caverne/report",
    "proprietaire-le-cahier-de-depenses": "caverne/expenses",
    "proprietaire-avances-au-personnel": "caverne/staff-advances",
    "proprietaire-ton-image": "caverne/logo",
    "proprietaire-nous-joindre": "caverne/support",
    "location-chambres-et-sejours": "caverne/rental-stay",
}
AUTRES = {      # nom dans img/en/ -> capture
    "proprietaire-1": "caverne/my-page-1",
    "proprietaire-2": "caverne/my-page-2",
    "proprietaire-3": "caverne/my-page-3",
}
PAGE_CLIENT = {f"page-publique-{i}": f"vitrine/page-publique-{i}" for i in range(1, 8)}   # page web du commerce (outils/site/capture_vitrine_en.py)

if __name__ == "__main__":
    ok = manque = 0
    for dic, sous, barre in ((ACCUEIL, "", True), (GUIDE, "guide", True), (AUTRES, "", True), (PAGE_CLIENT, "", False)):
        for nom, src in dic.items():
            r = base.fabriquer(src, os.path.join(ICI, "img", "en", sous, nom + ".webp"), barre)
            ok, manque = ok + r, manque + (not r)
            if not r: print("manque :", src)
    print(f"{ok} images anglaises fabriquées, {manque} captures manquantes")
