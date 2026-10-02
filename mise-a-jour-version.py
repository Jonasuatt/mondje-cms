# -*- coding: utf-8 -*-
"""Met à jour cms/version.json à partir de l'APK déposé dans « Plateforme SaaS Document ».

    python cms/mise-a-jour-version.py            # lit Mon-Dje.apk et réécrit version.json

Ce fichier alimente la page « Télécharger » et, plus tard, l'avertissement « une nouvelle version est disponible »
de l'application. À lancer avant de publier l'APK (Release GitHub) et le site.
"""
import datetime as dt, hashlib, json, os, re, subprocess, sys

APK = r"C:\Users\User\Documents\Claude\Plateforme SaaS Document\Mon-Dje.apk"
AAPT2 = r"C:\Users\User\AppData\Local\Android\Sdk\build-tools\35.0.0\aapt2.exe"
SORTIE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "version.json")
URL = "https://github.com/Jonasuatt/mondje-cms/releases/latest/download/Mon-Dje.apk"

badging = subprocess.run([AAPT2, "dump", "badging", APK], capture_output=True).stdout.decode("utf-8", "replace")
code = int(re.search(r"versionCode='(\d+)'", badging).group(1))
nom = re.search(r"versionName='([^']+)'", badging).group(1)
sdk = int(re.search(r"minSdkVersion:'(\d+)'", badging).group(1))
ANDROID = {24: "7", 26: "8", 28: "9", 29: "10", 30: "11", 31: "12", 33: "13"}
sha = hashlib.sha256(open(APK, "rb").read()).hexdigest()
info = {
    "versionCode": code, "versionName": nom, "date": dt.date.today().strftime("%d/%m/%Y"),
    "androidMin": ANDROID.get(sdk, str(sdk)), "tailleMo": round(os.path.getsize(APK) / 1_000_000),
    "sha256": sha, "apk": URL,
}
json.dump(info, open(SORTIE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(SORTIE, "a").write("\n")
print(info)
