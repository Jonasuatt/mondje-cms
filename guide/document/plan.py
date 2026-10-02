# -*- coding: utf-8 -*-
"""Plan du guide illustré (Word) : quelles captures, dans quel ordre, avec quelle légende.

    python cms/guide/document/plan.py        # écrit les JPEG réduits et plan.json (lu par construire.js)

Chaque chapitre = un commerce de démonstration. Dans une section, une légende `None` veut dire « suite de l'écran précédent ».
"""
import json, os, sys
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")
CAPTURES = r"C:\Users\User\Documents\Claude\Plateforme SaaS Document\captures"
ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "images")
os.makedirs(SORTIE, exist_ok=True)

S = lambda titre, *items: dict(titre=titre, items=list(items))

CHAPITRES = [
    dict(cle="baobab", titre="Maquis et restaurant", commerce="Maquis Le Baobab (Abidjan, Yopougon)",
         intro="Le restaurant sert de fil conducteur : tables, serveurs, caisse, bouteilles consignées. On y voit presque toutes les fonctions de l'application, du point de vue du propriétaire.",
         sections=[
        S("Accueil du propriétaire",
          ("accueil-1", "Les chiffres du jour : espèces non remises, crédits à recouvrer, remise de la caisse à confirmer, ventes."),
          ("accueil-2", "Les modules : stock, activité du jour, rapport, trésorerie, dépenses, bilan, fournisseurs…"),
          ("accueil-3", "La suite des modules : carte, salle, activités, QR de paiement, logo, page publique, personnel.")),
        S("Prendre une commande",
          ("vendre-salle-1", "L'onglet Vendre : les tables du maquis, avec le serveur et l'état de chacune."),
          ("vendre-salle-2", None),
          ("commande-table-1", "La commande d'une table : produits, quantités, total."),
          ("commande-table-2", None),
          ("commande-ajouter-produit", "Ajouter un produit : liste de la carte, stock affiché, « Fini pour aujourd'hui ? »."),
          ("annulation-demande", "Demander l'annulation d'une table déjà partie : le motif est obligatoire, la caisse tranche.")),
        S("Encaisser",
          ("encaisser-1", "Les modes de paiement : espèces, Wave, Orange Money, MTN, Moov, crédit, acompte."),
          ("encaisser-especes-1", "Espèces : le montant remis par le client…"),
          ("encaisser-especes-2", "…et la monnaie à rendre, calculée par l'application."),
          ("encaisser-wave-1", "Wave : le vendeur montre le QR du commerce au client."),
          ("encaisser-wave-2", "Il saisit le numéro avec lequel le client a payé."),
          ("encaisser-orange-1", "Orange Money, même principe."),
          ("encaisser-orange-2", None),
          ("encaisser-credit-1", "Crédit (ardoise) : nom, téléphone et délai du client sont obligatoires."),
          ("encaisser-credit-2", None),
          ("encaisser-acompte", "Acompte : le client paie une partie maintenant, le reste plus tard.")),
        S("La caisse",
          ("caisse-ouvrir", "Ouvrir la caisse : on compte les espèces du tiroir."),
          ("caisse-ouvrir-fond", "Le fond de caisse saisi."),
          ("caisse-1", "Pendant le service : paiements à valider, sorties faites, crédits."),
          ("caisse-2", None),
          ("validation-wave", "Valider un paiement Wave : on vérifie le montant et le numéro sur le téléphone du commerce."),
          ("validation-especes", "Valider un paiement en espèces : montant remis, monnaie à rendre."),
          ("facture-validee", "La facture est éditée dès la validation."),
          ("facture-validee-2", "Elle part par WhatsApp ou en PDF."),
          ("stock-alertes-caisse", "La caisse voit aussi le stock et ses alertes."),
          ("clients-caisse", "Les clients qui acceptent de recevoir la page du commerce."),
          ("fermer-caisse-1", "Fermer la caisse : espèces attendues et espèces comptées."),
          ("fermer-caisse-ecart", "S'il y a un écart, le motif est obligatoire.")),
        S("Les crédits clients (ardoises)",
          ("ardoises-1", "Qui doit combien, depuis quand, et pour quand c'est promis."),
          ("ardoises-2", None),
          ("ardoise-detail-1", "La fiche d'un client : relance WhatsApp, appel, historique des remboursements."),
          ("ardoise-detail-2", "Enregistrer un remboursement, en espèces ou en Mobile Money."),
          ("clients-1", "Les clients qui ont accepté de recevoir les messages du commerce.")),
        S("L'historique",
          ("historique-ventes-1", "Toutes les ventes, jour par jour, avec le vendeur, le caissier et la facture."),
          ("historique-ventes-2", None),
          ("historique-annulations-1", "Les annulations : qui, quand, pourquoi."),
          ("historique-annulations-2", None),
          ("historique-caisses-1", "Les caisses fermées, avec l'écart, son motif et la remise au propriétaire."),
          ("historique-caisses-2", None),
          ("historique-semaines", "Les ventes par semaine."),
          ("historique-mois", "Et par mois.")),
        S("Le stock et les livraisons",
          ("stock-liste", "Le stock de chaque produit, avec son seuil d'alerte."),
          ("stock-2", None),
          ("stock-3", None),
          ("stock-bas", "Les produits dont le stock est bas."),
          ("livraison-1", "Saisir une livraison reçue : par casier ou à l'unité."),
          ("livraison-2", "Le prix payé donne le prix de revient."),
          ("livraison-3", "Le fournisseur et les frais de livraison."),
          ("livraison-4", None)),
        S("L'inventaire",
          ("inventaire-1", "Pourquoi compter : l'écart entre le stock calculé et le stock réel, c'est le coulage."),
          ("inventaire-nouveau", "Un nouveau comptage : le stock affiché est caché pendant qu'on compte."),
          ("inventaire-comptage-1", "Le résultat : les écarts en francs, du plus lourd au plus léger, avec le motif."),
          ("inventaire-comptage-2", "Régulariser le stock, ou imputer la perte à un employé.")),
        S("Le bon d'achat",
          ("bon-achat-1", "Plusieurs produits d'une même facture, avec des frais partagés entre eux."),
          ("bon-achat-2", None)),
        S("La carte et les produits",
          ("carte-et-stock-1", "La carte : prix et stock de chaque produit, boutons d'ajout depuis le catalogue ou un fichier."),
          ("carte-et-stock-2", None),
          ("carte-et-stock-3", "Créer un produit absent du catalogue : nom, prix, unité, catégorie.")),
        S("Les fournisseurs",
          ("fournisseurs-1", "Ce que le commerce doit à ses fournisseurs, et depuis quand."),
          ("fournisseurs-2", None)),
        S("Les chiffres du patron",
          ("rapport-1", "Le rapport : encaissé, comparaison avec la période précédente, conseils."),
          ("rapport-2", None),
          ("rapport-3", None),
          ("bilan-septembre-1", "Le bilan du mois, à envoyer au comptable ou à la banque."),
          ("bilan-septembre-2", None),
          ("depenses-septembre-1", "Le cahier de dépenses : ce que le commerce a vendu, ce que la marchandise a coûté, ses charges."),
          ("depenses-septembre-2", None),
          ("tresorerie-1", "La trésorerie : l'argent réel, endroit par endroit (espèces, Wave, Orange…)."),
          ("tresorerie-2", None),
          ("tresorerie-3", None),
          ("meilleures-ventes-1", "Les meilleures ventes, en quantité ou en argent."),
          ("meilleures-ventes-2", None),
          ("classement-1", "Objectifs et classement du personnel."),
          ("classement-2", None),
          ("activite-du-jour-1", "L'activité du jour : commandes en cours et sorties de stock.")),
        S("Les tables et l'équipe",
          ("salle-1", "Gérer la salle : créer les tables, une à une ou par lot."),
          ("salle-2", None),
          ("personnel-1", "Le personnel : code du commerce, un compte par employé."),
          ("personnel-2", "Créer un compte : le rôle (vendeur, caissier, gérant) et le code provisoire."),
          ("avances-1", "Les avances au personnel."),
          ("points-de-vente-1", "Plusieurs points de vente, comparés."),
          ("mes-activites-1", "Les activités du commerce : vente, tables, location.")),
        S("Le commerce et l'abonnement",
          ("qr-de-paiement-1", "Déposer son QR marchand, que les vendeurs montrent aux clients."),
          ("logo-1", "Le logo, qui figure sur les factures."),
          ("telephones-1", "Les téléphones du commerce, imprimés sur les factures."),
          ("page-publique-1", "La page publique du commerce."),
          ("page-publique-2", None),
          ("exporter-1", "Exporter ses données (Excel) : produits, ventes, dettes."),
          ("abonnement-1", "L'abonnement : durée et paiement par Wave."),
          ("abonnement-2", None),
          ("assistance-1", "L'assistance Mon Djê : écrire à l'équipe depuis l'application.")),
    ]),

    dict(cle="fortune", titre="Boutique", commerce="Boutique La Fortune (Abidjan, Abobo)",
         intro="La boutique vend au détail, au kg ou au carton ; elle suit ses prix d'achat, sa marge et ses crédits clients.",
         sections=[
        S("Accueil", ("accueil-1", "Les chiffres du jour de la boutique."), ("accueil-2", None), ("accueil-3", None)),
        S("Vendre",
          ("vendre-liste", "Les ventes en cours, et une vente déjà encaissée en attente de la caisse."),
          ("nouvelle-vente-1", "Une nouvelle vente : les produits les plus vendus d'abord."),
          ("nouvelle-vente-2", "Les lignes de la vente, avec le total."),
          ("nouvelle-vente-3", None)),
        S("La caisse",
          ("caisse-ouvrir", "Ouverture de la caisse."),
          ("caisse-1", "Paiements à valider et sorties à valider."),
          ("caisse-2", None),
          ("validation-wave", "Valider un paiement mobile."),
          ("ardoises-1", "Les crédits clients.")),
        S("La carte, le catalogue et l'import",
          ("carte-et-stock-1", "La carte de la boutique : prix, marge et stock par produit."),
          ("carte-et-stock-2", None), ("carte-et-stock-3", None), ("carte-et-stock-4", None),
          ("catalogue-1", "Ajouter des produits depuis le catalogue Mon Djê : on choisit les rubriques que l'on vend."),
          ("catalogue-2", None)),
        S("Stock et fournisseurs",
          ("stock-1", "Le stock."), ("stock-2", None),
          ("fournisseurs-1", "Les dettes envers les fournisseurs."), ("fournisseurs-2", None)),
        S("Les chiffres du patron",
          ("rapport-1", "Le rapport de la période."), ("rapport-2", None), ("rapport-3", None),
          ("bilan-1", "Le bilan."), ("bilan-2", None),
          ("depenses-1", "Les dépenses."), ("depenses-2", None),
          ("meilleures-ventes-1", "Les meilleures ventes."), ("meilleures-ventes-2", None),
          ("classement-1", "Objectifs et classement."), ("classement-2", None)),
        S("Clients et équipe",
          ("clients-1", "Les clients."), ("personnel-1", "L'équipe : propriétaire, vendeurs, caissier."), ("personnel-2", None)),
    ]),

    dict(cle="marche", titre="Marché", commerce="Tantie Adjoua, Marché de Treichville (Abidjan)",
         intro="Au marché, on vend par tas, par sachet, par kilo ; on achète chaque matin et on vend dans la journée.",
         sections=[
        S("Accueil", ("accueil-1", "Les chiffres du jour."), ("accueil-2", None), ("accueil-3", None)),
        S("Vendre et encaisser",
          ("vendre-liste", "Les ventes en cours."),
          ("nouvelle-vente-1", "Une nouvelle vente : tas de tomates, d'oignons, sachets d'attiéké."),
          ("nouvelle-vente-2", None),
          ("encaisser-1", "Le paiement."),
          ("encaisser-orange", "Le paiement par Orange Money.")),
        S("Stock et carte",
          ("stock-1", "Le stock du marché."), ("stock-2", None),
          ("carte-et-stock-1", "La carte."), ("carte-et-stock-2", None), ("carte-et-stock-3", None)),
        S("Les chiffres",
          ("rapport-1", "Le rapport."), ("rapport-2", None), ("bilan-1", "Le bilan."), ("bilan-2", None)),
    ]),

    dict(cle="aya", titre="Vente directe", commerce="Aya Mode & Accessoires (Abidjan, Adjamé)",
         intro="La vente directe, c'est des articles à l'unité : vêtements, sacs, bijoux. Peu de ventes, des tickets élevés, beaucoup de Mobile Money.",
         sections=[
        S("Accueil", ("accueil-1", "Les chiffres du jour."), ("accueil-2", None), ("accueil-3", None)),
        S("Vendre et encaisser",
          ("vendre-liste", "Les ventes en cours."),
          ("nouvelle-vente-1", "Une nouvelle vente : sacs, foulards, bijoux."),
          ("nouvelle-vente-2", None),
          ("encaisser-1", "Le paiement."),
          ("encaisser-wave", "Le paiement par Wave.")),
        S("Stock et carte",
          ("stock-1", "Le stock."), ("stock-2", None),
          ("carte-et-stock-1", "La carte."), ("carte-et-stock-2", None)),
        S("Les chiffres, les clients et l'équipe",
          ("rapport-1", "Le rapport."), ("rapport-2", None), ("bilan-1", "Le bilan."), ("bilan-2", None),
          ("clients-1", "Les clients."), ("personnel-1", "L'équipe."), ("personnel-2", None)),
    ]),

    dict(cle="residence", titre="Location (chambres, logements, véhicules)", commerce="Résidence Les Flamboyants (Abidjan, Cocody)",
         intro="Le commerce de location suit ses chambres : arrivées, départs, cautions, ménage, réservations et baux mensuels. Les véhicules se louent de la même façon, avec compteur et carburant.",
         sections=[
        S("Accueil", ("accueil-1", "Les chiffres du jour de la résidence."), ("accueil-2", None), ("accueil-3", None)),
        S("Les chambres",
          ("chambres-1", "L'état de chaque chambre : occupée jusqu'à quand, libre, louée au mois, réservée."),
          ("chambres-2", None), ("chambres-3", None)),
        S("Un séjour en cours",
          ("sejour-note-1", "La note d'un séjour : nuitées, prolongation, départ, encaissement."),
          ("sejour-note-2", None),
          ("depart-dialogue", "Départ avant la date prévue : on facture toute la durée, ou on rend les nuits par une remise motivée.")),
        S("Une arrivée",
          ("arrivee-1", "Enregistrer une arrivée : client, pièce d'identité ou téléphone."),
          ("arrivee-2", "La durée, le tarif, la caution."), ("arrivee-3", None)),
        S("Réservations et calendrier",
          ("reservations-1", "Le calendrier des 14 prochains jours : séjours, réservations, baux."),
          ("reservations-2", "Les réservations à venir."),
          ("reservation-nouvelle", "Une nouvelle réservation : choisir la chambre, puis les dates.")),
        S("Baux et loyers",
          ("baux-1", "Les baux en cours, et un loyer en retard signalé."),
          ("baux-2", None),
          ("bail-nouveau", "Un nouveau bail : choisir la chambre à louer au mois."),
          ("bail-detail-1", "La fiche d'un bail : dépôt de garantie, loyers mois par mois."),
          ("bail-detail-2", None), ("bail-detail-3", None)),
        S("Les chambres et leurs tarifs",
          ("mes-chambres-1", "Créer et tarifier les chambres, les logements ou les véhicules."),
          ("mes-chambres-2", None), ("mes-chambres-3", None)),
        S("Occupation et revenus",
          ("occupation-revenus-1", "Le taux d'occupation, le prix moyen d'une nuit, le revenu par chambre."),
          ("occupation-revenus-2", "Loyers mensuels, cautions gardées, séjours en cours."),
          ("occupation-revenus-3", None)),
        S("Les chiffres du patron",
          ("rapport-1", "Le rapport."), ("rapport-2", None),
          ("bilan-septembre-1", "Le bilan."), ("bilan-septembre-2", None),
          ("depenses-septembre-1", "Les dépenses."), ("depenses-septembre-2", None),
          ("tresorerie-1", "La trésorerie."), ("tresorerie-2", None), ("tresorerie-3", None),
          ("mes-activites-1", "Les activités du commerce : ici, la location."),
          ("personnel-1", "L'équipe : propriétaire, réception, caisse."), ("personnel-2", None)),
    ]),
    dict(cle="caverne", titre="La page publique d'un commerce", commerce="La Caverne (Abidjan, Cocody) — page réelle, vue sur un téléphone",
         intro="Chaque commerce peut ouvrir une page publique que ses clients consultent sans compte, depuis un lien partagé sur WhatsApp : le logo, un bouton pour écrire ou appeler, l'événement à l'affiche, la galerie du jour et les produits avec leurs prix. Le propriétaire l'active et la règle depuis l'application (Profil → page publique). Cette page est tenue à jour d'après le stock réel du commerce.",
         sections=[
        S("Ce que voit le client",
          ("page-publique-1", "En haut de page : le logo, le nom, le lieu, deux boutons (écrire sur WhatsApp, appeler) et l'événement à l'affiche."),
          ("page-publique-2", "La galerie du jour, puis les produits rangés par rubrique."),
          ("page-publique-3", "En bas de page : « Qui est derrière Mon Djê ? » déplie l'auteur, les copropriétaires et la collaboration, avec le lien mondje.ci.")),
    ]),
]


def fabriquer(commerce, nom):
    src = os.path.join(CAPTURES, commerce, nom + ".png")
    if not os.path.exists(src):
        return None
    sortie = os.path.join(SORTIE, f"{commerce}__{nom}.jpg")
    if not os.path.exists(sortie) or os.path.getmtime(sortie) < os.path.getmtime(src):
        im = Image.open(src).convert("RGB")
        if commerce != "caverne":   # capture du navigateur, sans barre d'état à effacer
            ImageDraw.Draw(im).rectangle([0, 0, im.width, 66], fill=im.getpixel((6, 74)))   # barre d'état effacée
        im.resize((540, 1200), Image.LANCZOS).save(sortie, "JPEG", quality=78, optimize=True)
    return sortie


if __name__ == "__main__":
    manquantes, total = [], 0
    plan = []
    for ch in CHAPITRES:
        sections = []
        for s in ch["sections"]:
            items = []
            for nom, legende in s["items"]:
                f = fabriquer(ch["cle"], nom)
                if not f:
                    manquantes.append(f"{ch['cle']}/{nom}")
                    continue
                items.append(dict(fichier=f, legende=legende))
                total += 1
            sections.append(dict(titre=s["titre"], items=items))
        plan.append(dict(cle=ch["cle"], titre=ch["titre"], commerce=ch["commerce"], intro=ch["intro"], sections=sections))
    json.dump(plan, open(os.path.join(ICI, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(total, "captures retenues ; manquantes :", manquantes)
    utilisees = {os.path.basename(i["fichier"]) for c in plan for s in c["sections"] for i in s["items"]}
    toutes = {f"{c}__{os.path.splitext(f)[0]}.jpg" for c in os.listdir(CAPTURES) if os.path.isdir(os.path.join(CAPTURES, c)) for f in os.listdir(os.path.join(CAPTURES, c)) if f.endswith(".png")}
    print("captures non utilisées :", len(toutes - utilisees))
