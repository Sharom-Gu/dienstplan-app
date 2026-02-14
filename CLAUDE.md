# Dienstplan-App - Projekt-Status

## Aktueller Stand (14.02.2026)

### DEPLOYMENT STATUS: LIVE

**Live-URL:** https://elaborate-daffodil-c7fa70.netlify.app

| Service | Status | Details |
|---------|--------|---------|
| GitHub | ✅ | https://github.com/Sharom-Gu/dienstplan-app |
| Netlify | ✅ | elaborate-daffodil-c7fa70.netlify.app |
| Firebase Auth | ✅ | dienstplan-nevpaz |
| Firestore | ✅ | Regeln deployed |

---

## SICHERHEITSHINWEIS

**Sensible Daten werden NICHT im Repository gespeichert!**
- Keine API-Keys in CLAUDE.md oder im Code
- Keine Admin-Passwoerter in CLAUDE.md
- API-Key wurde am 14.02.2026 rotiert (alter Key aus Git-History entfernt)
- Firebase-Konfiguration liegt in `.env` (lokal) und Netlify Environment Variables (Production)

### Wo sind die Zugangsdaten?
- **Lokal:** `.env` im Projekt-Root und `dienstplan-app/.env.local`
- **Production:** Netlify Dashboard → Site Settings → Environment Variables
- **Admin-Verwaltung:** Firebase Console → Project: dienstplan-nevpaz → Authentication

---

## WICHTIG: Zwei src-Verzeichnisse

Das Projekt hat **zwei separate `src/`-Verzeichnisse**:

| Verzeichnis | Verwendung | Hinweis |
|------------|------------|---------|
| `/src/` (Root) | Lokaler Dev-Server (`npm run dev` im Root) | Wird von Vite im Root geladen |
| `/dienstplan-app/src/` | Netlify Deployment (GitHub Push) | Neuere Version, wird von Netlify gebaut |

**Problem:** Aenderungen muessen in BEIDEN Verzeichnissen gemacht werden, damit lokal und live synchron bleiben. Nach einem `git pull` kann die Root-`/src/` aelteren Code haben als `dienstplan-app/src/`.

**Empfehlung:** Langfristig sollte eines der beiden Verzeichnisse entfernt werden.

---

## Firebase-Konfiguration

- **Projekt-ID:** `dienstplan-nevpaz`
- **Auth-Domain:** dienstplan-nevpaz.firebaseapp.com
- **Storage-Bucket:** dienstplan-nevpaz.firebasestorage.app

Umgebungsvariablen (in `.env` und Netlify):
- `VITE_FIREBASE_API_KEY` (PRIVAT - nicht hier gespeichert!)
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

---

## Entwicklung

### Lokal entwickeln

```bash
cd /Users/sharom/Claude_Program/Dienstplan_Nevpaz

# Dependencies (falls noetig)
npm install

# Dev-Server starten
npm run dev
# Laeuft auf http://localhost:3000/
```

### Aenderungen deployen

```bash
cd /Users/sharom/Claude_Program/Dienstplan_Nevpaz

git add .
git commit -m "Beschreibung der Aenderung"
git push origin main
# Netlify deployed automatisch
```

### SSH-Key fuer GitHub

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

**Remote:** `git@github.com:Sharom-Gu/dienstplan-app.git` (SSH)

---

## Technologie-Stack

- **Frontend:** React + Vite
- **Backend:** Firebase (Auth + Firestore)
- **Styling:** Dark Theme CSS mit Custom Properties
- **Hosting:** Netlify (automatisches Deployment via GitHub)
- **Benachrichtigungen:** Microsoft Teams Webhook (Neue Registrierungen)

---

## Projektstruktur

```
Dienstplan_Nevpaz/
├── src/                          # Root-Source (lokale Entwicklung)
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   └── InviteRegister.jsx
│   │   ├── Calendar/
│   │   ├── Admin/
│   │   │   └── AdminDashboard.jsx
│   │   ├── User/
│   │   └── Layout/
│   ├── hooks/
│   ├── services/
│   │   ├── authService.js
│   │   ├── shiftService.js
│   │   ├── vacationService.js
│   │   ├── invitationService.js
│   │   └── teamsNotificationService.js
│   ├── utils/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── dienstplan-app/               # Netlify-Source (Production)
│   └── src/                      # Gleiche Struktur wie oben
├── .env                          # Firebase-Keys (NICHT im Git!)
├── CLAUDE.md
├── package.json
└── vite.config.js
```

---

## Rollensystem

### Mitarbeiter-Rollen

| Rolle | Wochenstunden | Urlaubstage | Schichtplanung |
|-------|--------------|-------------|----------------|
| **Arzt** | keine Vorgabe | 30 | Keine (eigene Planung) |
| **MFA** | keine Vorgabe | 30 | Keine (eigene Planung) |
| **Werkstudent** | 20h | 15 | Ja (Schichtsystem) |
| **Minijobber** | 10h | 15 | Ja (Schichtsystem) |
| **Admin** | - | - | Verwaltung |

### Rollen-Badges (farbcodiert)
- Arzt: Blau
- MFA: Gruen
- Werkstudent: Cyan
- Minijobber: Orange
- Admin: Gelb

---

## Schichtmodell

Fuer Werkstudenten: 3 Tage/Woche = 20 Stunden

**2x Kurzschicht (6h):**
- Frueh (09:00-15:00)
- Spaet (13:00-19:00)

**1x Langschicht (8h Arbeitszeit):**
- Lang-Frueh: 09:00-17:30 (8,5h Anwesenheit, 30 Min Pause)
- Lang-Spaet: 10:30-19:00 (8,5h Anwesenheit, 30 Min Pause)

**Kapazitaeten:**
- Fruehschicht (frueh): 2 Plaetze
- Spaetschicht (spaet): 2 Plaetze
- Lang-Frueh (lang_frueh): 1 Platz
- Lang-Spaet (lang_spaet): 1 Platz

---

## Features

### Nutzer-Bereich (3 Ansichten)

1. **Mein Dienstplan** - Persoenlicher Wochenkalender mit eigenen Schichten
2. **Team-Uebersicht** - Alle Schichten mit allen Mitarbeitern, Buchung moeglich
3. **Urlaub & Krankheit** - Urlaubstage-Verwaltung, Krankheitsmeldung

### Admin-Bereich (4 Tabs)

1. **Kalender-Tab**
   - Schichtverwaltung, Bulk-Erstellung (4-52 Wochen)
   - Mitarbeiter zuweisen mit Stundenwarnung
   - "Alle loeschen" Button (doppelte Bestaetigung)

2. **Urlaub-Tab**
   - Uebersicht aller Mitarbeiter (Gesamt/Genommen/Rest/Krank)
   - Urlaubstage bearbeiten, anteilige Berechnung
   - Krankheit fuer Mitarbeiter eintragen

3. **Benutzer-Tab**
   - Einladungslinks erstellen
   - **Passwort zuruecksetzen** (sendet Reset-E-Mail)
   - Rollenverwaltung (Arzt, MFA, Werkstudent, Minijobber, Admin)
   - Zugang entziehen/wiederherstellen
   - Rollen-Badges farbcodiert

4. **Audit-Log-Tab** - Protokoll aller Aktionen

### Admin-Dashboard Widgets
- **Krankmeldungen der Woche** - Zeigt aktuelle Krankmeldungen
- **Geburtstage** - Zeigt anstehende Geburtstage der Mitarbeiter

### Einladungssystem
- Admin erstellt Einladungslinks (einmalig verwendbar)
- Registrierung nur ueber Einladungslink moeglich
- Benutzer sind sofort freigeschaltet (Status: approved)

### Session-Verhalten
- Session endet bei Tab/Browser-Schliessung (`browserSessionPersistence`)

---

## Datenmodell (Firestore Collections)

- **users** - Benutzerdaten (Name, E-Mail, Rolle, Status, Geburtstag, Wochenstunden, Urlaubstage)
- **shifts** - Schichten (Datum, Typ, Zeit, Kapazitaet)
- **bookings** - Buchungen (Schicht-ID, User-ID, Status)
- **vacations** - Urlaub und Krankheitstage
- **invitations** - Einladungslinks
- **auditLogs** - Protokoll aller Aktionen
- **deletionRequests** - Loeschungsanfragen

### User-Status-Typen
- `pending` - Wartet auf Freigabe
- `approved` - Freigeschaltet
- `rejected` - Abgelehnt
- `revoked` - Zugang entzogen

---

## Services

### authService.js
- `loginUser()` - Login mit Status-Pruefung (pending/rejected/revoked)
- `registerUser()` - Registrierung mit Teams-Benachrichtigung
- `approveUser(userId, role)` - Genehmigung mit rollenspezifischen Einstellungen
- `rejectUser()` / `revokeUser()` - Ablehnung/Zugang entziehen
- `changeUserRole()` - Rolle aendern (inkl. Urlaubstage/Wochenstunden)
- `sendPasswordReset(email)` - Passwort-Reset E-Mail senden
- `updateUserBirthDate()` - Geburtsdatum aktualisieren
- `getPendingUsers()` / `getApprovedUsers()` - Benutzerlisten

### shiftService.js
- `generateMultipleWeeksShifts()` - Bulk-Erstellung
- `weekHasShifts()` - Prueft ob Woche bereits Schichten hat
- `deleteAllShifts()` - Loescht alle Schichten
- `getShiftTypes()` - Standard-Schichttypen

### invitationService.js
- `createInvitation()` - Erstellt Einladungstoken
- `validateInvitation()` - Prueft ob Token gueltig
- `markInvitationUsed()` - Token als verwendet markieren
- `getInvitations()` - Alle Einladungen eines Admins

### teamsNotificationService.js
- `notifyNewUserRegistration()` - Teams-Webhook bei neuer Registrierung

---

## Letzte Aenderungen (14.02.2026)

1. **API-Key rotiert** - Alter Key war in Git-History, neuer Key nur in .env und Netlify
2. **Rollen-System erweitert** - Arzt, MFA, Werkstudent, Minijobber (statt nur Benutzer/Admin)
3. **Passwort-Reset** - Admin kann Reset-E-Mail an Benutzer senden
4. **Dashboard-Widgets** - Krankmeldungen und Geburtstage im Admin-Bereich
5. **Git Remote** - Umgestellt von HTTPS auf SSH
6. **Sicherheits-Cleanup** - Sensible Daten aus CLAUDE.md und Git-History entfernt
7. **Production Build** - Erfolgreich getestet (899 Module kompiliert)

---

## Bekannte Einschraenkungen

- Zwei `src/`-Verzeichnisse muessen synchron gehalten werden
- Firestore-Queries: Sortierung erfolgt client-seitig (Index-Probleme vermeiden)
- Demo-Modus verfuegbar (`DEMO_MODE = true` in App.jsx), aber Production nutzt `false`
