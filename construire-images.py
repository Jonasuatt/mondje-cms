# -*- coding: utf-8 -*-
"""Fabrique les images du site (cms/img/*.webp) et du guide (cms/img/guide/*.webp) à partir des captures d'écran.

Les captures PNG brutes sont dans « Plateforme SaaS Document/captures/<commerce>/<nom>.png » (hors dépôt : lourdes).
Chaque image du site est choisie ici, une fois : pour la changer, on change une ligne et on relance.

    python cms/construire-images.py
"""
import os, sys
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
CAPTURES = r"C:\Users\User\Documents\Claude\Plateforme SaaS Document\captures"
ICI = os.path.dirname(os.path.abspath(__file__))
LARGEUR, HAUTEUR = 540, 1200          # 720 x 1600 d'origine, réduit d'un quart

# page d'accueil : nom de l'image -> commerce/capture
ACCUEIL = {
    "hero-vendre": "baobab/commande-table-1",
    "ecran-vendre": "fortune/nouvelle-vente-2",
    "ecran-paiement": "baobab/encaisser-especes-1",
    "ecran-caisse": "baobab/caisse-1",
    "ecran-stock": "baobab/stock-liste",
    "ecran-inventaire": "baobab/inventaire-comptage-1",
    "ecran-ardoises": "baobab/ardoises-1",
    "ecran-bilan": "baobab/bilan-septembre-1",
    "ecran-location": "residence/chambres-1",
}

# guide : clé de rubrique (voir guide/generer.mjs) -> commerce/capture
GUIDE = {
    "vendeur-prendre-une-commande": "baobab/commande-table-1",
    "vendeur-encaisser": "baobab/encaisser-1",
    "vendeur-annuler": "baobab/annulation-demande",
    "caisse-ouvrir-la-caisse": "baobab/caisse-ouvrir",
    "caisse-pendant-le-service": "baobab/caisse-1",
    "caisse-fermer-la-caisse": "baobab/fermer-caisse-ecart",
    "gerant-la-carte": "fortune/carte-et-stock-1",
    "gerant-le-stock": "baobab/stock-liste",
    "gerant-l-inventaire": "baobab/inventaire-comptage-1",
    "gerant-les-fournisseurs": "baobab/fournisseurs-1",
    "gerant-la-tresorerie": "baobab/tresorerie-1",
    "proprietaire-ton-personnel": "baobab/personnel-1",
    "proprietaire-ce-que-tu-dois-regarder-chaque-soir": "baobab/rapport-1",
    "proprietaire-le-cahier-de-depenses": "baobab/depenses-septembre-1",
    "proprietaire-avances-au-personnel": "baobab/avances-1",
    "proprietaire-ton-image": "baobab/logo-1",
    "proprietaire-nous-joindre": "baobab/assistance-1",
    "location-chambres-et-sejours": "residence/sejour-note-1",
}


def fabriquer(source, sortie):
    chemin = os.path.join(CAPTURES, source.replace("/", os.sep) + ".png")
    if not os.path.exists(chemin):
        return False
    im = Image.open(chemin).convert("RGB")
    # La barre d'état du téléphone (heure, batterie, notifications personnelles) n'a rien à faire sur le site :
    # on la peint de la couleur du fond de l'application juste dessous.
    from PIL import ImageDraw
    fond = im.getpixel((6, 74))
    ImageDraw.Draw(im).rectangle([0, 0, im.width, 66], fill=fond)
    im = im.resize((LARGEUR, HAUTEUR), Image.LANCZOS)
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    im.save(sortie, "WEBP", quality=80, method=6)
    return True


if __name__ == "__main__":
    ok = manque = 0
    for nom, src in ACCUEIL.items():
        r = fabriquer(src, os.path.join(ICI, "img", nom + ".webp"))
        ok, manque = ok + r, manque + (not r)
        if not r: print("manque :", src)
    for cle, src in GUIDE.items():
        r = fabriquer(src, os.path.join(ICI, "img", "guide", cle + ".webp"))
        ok, manque = ok + r, manque + (not r)
        if not r: print("manque :", src)
    print(f"{ok} images fabriquées, {manque} captures manquantes")
