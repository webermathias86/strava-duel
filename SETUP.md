# 🚴 Strava Duel – Setup Guide

## Was du brauchst
- [GitHub Account](https://github.com) (kostenlos)
- [Vercel Account](https://vercel.com) (kostenlos)
- Strava Account (hast du bereits)
- ca. 20 Minuten

---

## Schritt 1: Strava App erstellen

1. Gehe zu **https://www.strava.com/settings/api**
2. Klick auf "Create & Manage Your App"
3. Füll aus:
   - **Application Name:** `Strava Duel`
   - **Category:** `Data Importer`
   - **Website:** `https://deine-app.vercel.app` *(kommt gleich)*
   - **Authorization Callback Domain:** `deine-app.vercel.app`
4. Notiere dir **Client ID** und **Client Secret**

---

## Schritt 2: Code auf GitHub pushen

```bash
# Im Projektordner (strava-duel):
git init
git add .
git commit -m "Initial commit"

# Dann auf github.com ein neues (leeres) Repo erstellen, z.B. "strava-duel"
git remote add origin https://github.com/DEIN_USERNAME/strava-duel.git
git push -u origin main
```

---

## Schritt 3: Auf Vercel deployen

1. Gehe zu **https://vercel.com/new**
2. Importiere dein GitHub-Repo `strava-duel`
3. Klick **Deploy** (Einstellungen bleiben Standard)

---

## Schritt 4: Vercel KV Datenbank einrichten

1. Im Vercel Dashboard → dein Projekt → **Storage**
2. Klick **Create Database** → **KV** auswählen
3. Gib einen Namen ein (z.B. `strava-duel-kv`)
4. Klick **Create & Connect** → wähle dein Projekt aus
5. Die Umgebungsvariablen (`KV_URL` etc.) werden **automatisch** gesetzt ✅

---

## Schritt 5: Umgebungsvariablen setzen

Im Vercel Dashboard → dein Projekt → **Settings** → **Environment Variables**:

| Variable | Wert |
|---|---|
| `STRAVA_CLIENT_ID` | Deine Strava Client ID |
| `STRAVA_CLIENT_SECRET` | Dein Strava Client Secret |
| `VITE_STRAVA_CLIENT_ID` | Dieselbe Strava Client ID |

Dann: **Settings → Domains** – notiere dir deine URL, z.B. `https://strava-duel.vercel.app`

---

## Schritt 6: Strava Callback URL aktualisieren

1. Zurück zu **https://www.strava.com/settings/api**
2. **Authorization Callback Domain** auf `strava-duel.vercel.app` setzen (ohne https://)
3. **Website** auf `https://strava-duel.vercel.app`

---

## Schritt 7: Nochmal deployen

Im Vercel Dashboard → **Deployments** → **Redeploy** (damit die Env-Variablen aktiv werden)

---

## Schritt 8: Verbinden!

1. Öffne deine App-URL
2. Klick "Mit Strava verbinden" → authorize
3. Schick deinem Kumpel **denselben Link**
4. Er klickt auch auf "Mit Strava verbinden"
5. Dashboard erscheint automatisch 🎉

---

## ⚠️ Wichtige Hinweise

- **Tokens werden sicher in Vercel KV gespeichert** – niemand außer euch kann sie sehen
- Die App aktualisiert Daten alle 15 Minuten automatisch (Cache)
- Beide Fahrer müssen die App **einmalig** autorisieren – danach läuft alles automatisch
- Im kostenlosen Vercel-Plan gibt es 100GB Transfer/Monat – völlig ausreichend

---

## Probleme?

**"Fehler beim Verbinden"** → Prüfe ob die Callback Domain in Strava korrekt gesetzt ist (kein https://, kein /)

**Daten erscheinen nicht** → Prüfe ob alle 3 Env-Variablen gesetzt sind und du nochmal deployed hast

**Kumpel sieht seinen Namen nicht** → Er muss auch über den App-Link connecten, nicht direkt über Strava
