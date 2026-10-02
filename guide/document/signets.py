"""docx-js donne le même numéro (1) à tous les signets : Word s'en accommode, le validateur non.
On les renumérote, départ et fin d'un même signet ensemble.   python signets.py [fichier.docx]"""
import re
import shutil
import sys
import zipfile

SORTIE = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\User\Documents\Claude\Plateforme SaaS Document\2 - Guides et présentations\Mon-Dje-guide-illustre.docx"
n = 0


def renum(m):
    global n
    n += 1
    return f'<w:bookmarkStart {m.group(1)}w:id="{n}"/>{m.group(2)}<w:bookmarkEnd w:id="{n}"/>'


tmp = SORTIE + ".tmp"
with zipfile.ZipFile(SORTIE) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == "word/document.xml":
            data = re.sub(r'<w:bookmarkStart ([^>]*?)w:id="\d+"/>([\s\S]*?)<w:bookmarkEnd w:id="\d+"/>', renum,
                          data.decode("utf-8")).encode("utf-8")
        zout.writestr(item, data)
shutil.move(tmp, SORTIE)
print(n, "signets renumérotés")
