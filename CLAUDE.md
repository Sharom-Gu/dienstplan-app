# Dienstplan-App - Projekt-Status

## Aktueller Stand (08.02.2026)

### DEPLOYMENT STATUS: LIVE ✅

**Live-URL:** https://elaborate-daffodil-c7fa70.netlify.app

| Service | Status | Details |
|---------|--------|---------|
| GitHub | ✅ | https://github.com/Sharom-Gu/dienstplan-app |
| Netlify | ✅ | elaborate-daffodil-c7fa70.netlify.app |
| Firebase Auth | ✅ | dienstplan-nevpaz |
| Firestore | ✅ | Regeln deployed |

---

## ADMIN-ZUGANG

**Admin-Account:**
- E-Mail: In Firebase Console → Authentication einsehen
- Passwort: Weissenhof21

**Wichtig:** Die Firestore-Dokument-ID muss mit der Firebase Auth UID übereinstimmen!

---

## Firebase-Konfiguration

**Projekt-ID:** `dienstplan-nevpaz`

```
VITE_FIREBASE_API_KEY=AIzaSyDy0O3yJshzo9-1j6o2HpFx2_QmWzVU5PQ
VITE_FIREBASE_AUTH_DOMAIN=dienstplan-nevpaz.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dienstplan-nevpaz
VITE_FIREBASE_STORAGE_BUCKET=dienstplan-nevpaz.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1071522368252
VITE_FIREBASE_APP_ID=1:1071522368252:web:f49dc965854d18e64a2579
```

Diese Variablen sind bereits in Netlify konfiguriert.

---

## Entwicklung fortsetzen

### Lokal entwickeln
```bash
cd /Users/sharom/Claude_Program/Dienstplan_Nevpaz/dienstplan-app

# Dependencies (falls nötig)
npm install

# Dev-Server starten
npm run dev

# Demo-Modus aktivieren (für lokale Tests ohne Firebase)
# In src/App.jsx: DEMO_MODE = true
```

### Änderungen deployen
```bash
# Code committen
git add .
git commit -m "Beschreibung der Änderung"

# Zu GitHub pushen (Netlify deployed automatisch)
git push origin main
```

### SSH-Key für GitHub
SSH-Key wurde erstellt und zu GitHub hinzugefügt:
- Privat: `~/.ssh/id_ed25519`
- Öffentlich: `~/.ssh/id_ed25519.pub`

Falls SSH nicht funktioniert:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

---

## Was wurde implementiert

Die komplette Dienstplan-App ist fertig implementiert:

- **Frontend**: React + Vite
- **Backend**: Firebase (Auth + Firestore)
- **Styling**: Dark Theme CSS mit Custom Properties
- **Demo-Modus**: Vollständig funktionsfähig ohne Firebase
- **Hosting**: Netlify (automatisches Deployment via GitHub)

### Projektstruktur
```
dienstplan-app/
├── src/
│   ├── components/
│   │   ├── Auth/Login.jsx           # Login/Registrierung mit Admin-Freigabe
│   │   ├── Calendar/                 # WeekView, DayColumn, ShiftCard
│   │   ├── Admin/                    # AdminDashboard, ShiftEditor, AdminVacationView, AuditLog
│   │   ├── User/                     # UserDashboard, PersonalSchedule, WeeklyHours, VacationView
│   │   └── Layout/                   # Header, Navigation
│   ├── hooks/                        # useAuth, useShifts, useBookings
│   ├── services/                     # Firebase-Services (authService, shiftService, vacationService)
│   ├── utils/                        # dateUtils, validation
│   └── App.jsx, main.jsx, index.css
├── firebase/firestore.rules          # Sicherheitsregeln für Firestore
├── netlify.toml                      # Netlify Build-Konfiguration
└── Konfigurationsdateien
```

### Demo-Modus
Die App kann im Demo-Modus laufen (`DEMO_MODE = true` in App.jsx).
- Kein Login erforderlich
- Umschalten zwischen Nutzer- und Admin-Ansicht
- Alle Features testbar mit Demo-Daten
- Demo-Daten für aktuelle UND nächste Woche
- Wochen-Navigation funktioniert vollständig

**Für Produktion ist DEMO_MODE = false gesetzt.**

### Schichtmodell
Jeder Mitarbeiter arbeitet 3 Tage/Woche = 20 Stunden:
- **2x Kurzschicht (6h)**: Früh (09:00-15:00) oder Spät (13:00-19:00)
- **1x Langschicht (8h Arbeitszeit)**: Mit 30 Min. Pause (wird nicht mitgezählt)
  - **Lang-Früh**: 09:00-17:30 (8,5h Anwesenheit, 8h Arbeitszeit)
  - **Lang-Spät**: 10:30-19:00 (8,5h Anwesenheit, 8h Arbeitszeit)

Kapazitäten:
- Frühschicht (frueh): 2 Plätze
- Spätschicht (spaet): 2 Plätze
- Lang-Früh (lang_frueh): 1 Platz
- Lang-Spät (lang_spaet): 1 Platz

**Langschicht-Logik**: Beide Langschichten werden angezeigt, aber nur eine pro Tag kann gebucht werden. Wird eine Langschicht gebucht, wird die andere gesperrt ("Andere Langschicht gebucht").

### Features

#### Nutzer-Bereich (3 Ansichten umschaltbar)

1. **Mein Dienstplan**
   - Persönlicher Wochenkalender mit eigenen Schichten als Zeitbalken
   - Farbcodierung: Cyan (Früh), Gelb (Spät), Grün (Lang)
   - Wochenstunden-Anzeige (nur aktuelle Woche, ohne Pausen)
   - Bei Langschichten: "(30 Min Pause)" Hinweis
   - Wochen-Navigation (← Heute →)

2. **Team-Übersicht**
   - Alle Schichten mit allen Mitarbeitern
   - Mitarbeiter-Filter
   - Freie Schichten Button
   - Sofortige Buchung (ohne Genehmigung)
   - Wochenstunden-Anzeige
   - **Langschicht-Sperrung**: Nur eine Langschicht pro Tag buchbar (beide werden angezeigt, aber nach Buchung einer wird die andere gesperrt)

3. **Urlaub & Krankheit**
   - Urlaubstage-Übersicht (Gesamt, Genommen, Verbleibend, Krankheitstage)
   - Umschalter zwischen Urlaub und Krankheit eintragen
   - Wochenend-Validierung (Sa/So nicht wählbar)
   - Monatskalender mit farbcodierten Mitarbeitern (10 Farben)
   - Krankheitstage rot mit 🤒 Symbol
   - Legende mit allen Mitarbeitern und ihren Farben
   - Eigene Einträge auflisten und löschen

#### Admin-Bereich (4 Tabs)

1. **Kalender-Tab**
   - Wochenübersicht aller Schichten
   - Schichten hinzufügen/bearbeiten/löschen
   - **Bulk-Schichterstellung**: Schichten für mehrere Wochen auf einmal generieren
     - Optionen: 4 Wochen, 12 Wochen, 26 Wochen (½ Jahr), 52 Wochen (1 Jahr)
     - Überspringt Wochen die bereits Schichten haben
     - Generiert alle 4 Schichttypen: Früh, Spät, Lang-Früh, Lang-Spät
   - **"Alle löschen" Button**: Löscht alle Schichten (mit doppelter Bestätigung)
   - Mitarbeiter manuell zuweisen (mit Stundenwarnung bei 20h+)
   - Individuelle Arbeitszeiten pro Buchung anpassen

2. **Urlaub-Tab**
   - Übersicht aller Mitarbeiter mit Urlaubstagen (Gesamt/Genommen/Rest/Krank)
   - Urlaubstage pro Mitarbeiter bearbeiten
   - Eintrittsdatum setzen für anteilige Berechnung
   - "Anteilig berechnen" Button für neue Mitarbeiter
   - **Krankheit für Mitarbeiter eintragen** (Formular)
   - Monatskalender mit farbcodierten Mitarbeitern
   - **Klappbare Monatsliste** für Urlaube & Krankheitstage
   - **Jahresnavigation** (← 2026 →)
   - Einträge die über Monate gehen erscheinen in beiden Monaten

3. **Benutzer-Tab**
   - **Einladungslink erstellen**: Generiert einmaligen Registrierungslink
   - **Aktive Benutzer**: Alle genehmigten Mitarbeiter
     - Rolle ändern (Benutzer/Admin)
     - **Passwort zurücksetzen**: Sendet E-Mail zum Zurücksetzen des Passworts
     - Zugang entziehen
   - Rollen-Badges (Admin = gelb, Benutzer = cyan)

4. **Audit-Log-Tab**
   - Protokoll aller Aktionen

### Session-Verhalten
- **Session endet bei Tab/Browser-Schließung**: Benutzer werden automatisch ausgeloggt wenn sie den Tab oder Browser schließen
- Verwendet `browserSessionPersistence` statt `browserLocalPersistence`

### Urlaubs- und Krankheitssystem
- **15 Urlaubstage pro Jahr** (Standard)
- **Anteilige Berechnung**: Bei Eintritt während des Jahres
- **Krankheitstage**: Unbegrenzt, werden separat gezählt
- Nur Arbeitstage (Mo-Fr) werden gezählt
- **Wochenenden können nicht als Start/Ende gewählt werden**
- Mitarbeiter können selbst Urlaub UND Krankheit eintragen
- Admin kann Krankheit für Mitarbeiter eintragen

### Stundenberechnung
- **Kurzschichten**: Volle Dauer wird gezählt (6h)
- **Langschichten**: 30 Min Pause wird abgezogen (8,5h → 8h)
- **Wochenfilter**: Nur Schichten der angezeigten Woche werden gezählt
- Anzeige im Kalender zeigt volle Anwesenheitszeit
- Berechnung verwendet nur Arbeitszeit

### Mitarbeiter-Farben im Kalender
10 Farben werden automatisch zugewiesen:
- Cyan, Pink, Grün, Gelb, Lila, Orange, Blau, Rot, Teal, Magenta
- Konsistent in Mitarbeiter- und Admin-Ansicht
- Krankheitstage immer rot (überschreibt Mitarbeiterfarbe)

### Einladungssystem (NEU!)
Statt öffentlicher Registrierung gibt es jetzt Einladungslinks:

1. **Admin erstellt Einladung:**
   - Admin-Bereich → Benutzer-Tab → "Einladungslink erstellen"
   - System generiert einmaligen Link: `https://app.com/invite/TOKEN`
   - Admin kopiert und teilt den Link

2. **Mitarbeiter registriert sich:**
   - Klickt auf den Einladungslink
   - Gibt Name, E-Mail, Passwort ein
   - Ist sofort freigeschaltet (Status: `approved`)

3. **Vorteile:**
   - Nur eingeladene Personen können sich registrieren
   - Keine manuelle Freigabe nötig
   - Links funktionieren nur einmal

Status-Typen:
- `approved` - Freigegeben, kann sich einloggen
- `revoked` - Zugang entzogen

### Dark Theme Design
CSS-Variablen in `index.css`:
```css
--primary-bg: #0F1419;      /* Haupthintergrund */
--secondary-bg: #1a2029;    /* Sekundärer Hintergrund */
--surface-bg: #232b36;      /* Oberflächen */
--accent: #FDB913;          /* Akzent (Gelb) */
--accent-cyan: #00D4FF;     /* Cyan */
--accent-green: #00C875;    /* Grün */
--accent-red: #ff4757;      /* Rot */
--text-primary: #FFFFFF;
--text-secondary: #A0A0A0;

/* Mitarbeiter-Farben */
--employee-color-0: #00D4FF;  /* Cyan */
--employee-color-1: #FF6B9D;  /* Pink */
--employee-color-2: #00C875;  /* Green */
/* ... bis --employee-color-9 */
```

### Datenmodell (Firestore Collections)

#### users
```javascript
{
  displayName: "Max Mustermann",
  email: "max@example.com",
  role: "user" | "admin",
  status: "pending" | "approved" | "rejected" | "revoked",
  weeklyMinHours: 20,
  vacationDays: 15,              // Urlaubstage pro Jahr
  employmentStartDate: "2026-04-01",  // Für anteilige Berechnung
  createdAt: Timestamp,
  approvedAt: Timestamp,
  revokedAt: Timestamp
}
```

#### shifts
```javascript
{
  date: "2026-02-03",
  type: "frueh" | "spaet" | "lang_frueh" | "lang_spaet",
  startTime: "09:00",
  endTime: "15:00",
  capacity: 2
}
```

#### bookings
```javascript
{
  shiftId: "shift123",
  userId: "user456",
  userName: "Max Mustermann",
  status: "active" | "cancelled",
  customStartTime: "10:00",  // Optional: Admin-angepasste Zeit
  customEndTime: "14:00",
  createdAt: Timestamp
}
```

#### vacations (Urlaub & Krankheit)
```javascript
{
  userId: "user456",
  userName: "Max Mustermann",
  startDate: "2026-07-01",
  endDate: "2026-07-12",
  days: 10,                    // Berechnete Arbeitstage
  type: "vacation" | "sick",   // Urlaub oder Krankheit
  status: "approved",
  note: "Sommerurlaub",        // Optional
  createdAt: Timestamp
}
```

#### invitations (Einladungslinks)
```javascript
{
  token: "ABC123xyz...",       // Einmaliger 32-Zeichen Token
  createdBy: "admin-uid",
  createdByName: "Admin Name",
  createdAt: Timestamp,
  usedAt: null | Timestamp,    // null = noch nicht verwendet
  usedBy: null | "user-uid",
  usedByName: null | "User Name"
}
```

### Hinweise
- Demo-Modus zeigt Schichten für aktuelle UND nächste Woche
- "Heute" Button springt zur aktuellen Woche
- Buchungen werden sofort bestätigt (keine Genehmigung erforderlich)
- Vergangene Schichten können nicht mehr gebucht werden
- Wochenenden können nicht als Urlaubs-/Krankheitsdatum gewählt werden
- **Firestore-Queries**: Sortierung erfolgt client-seitig um Index-Probleme zu vermeiden

---

## Neue Services und Funktionen (08.02.2026)

### shiftService.js - Neue Funktionen
- `generateMultipleWeeksShifts(startDate, numberOfWeeks, createdBy, shiftTypes)` - Bulk-Erstellung
- `weekHasShifts(weekStart)` - Prüft ob Woche bereits Schichten hat
- `deleteAllShifts()` - Löscht alle Schichten
- `getShiftTypes()` - Gibt Standard-Schichttypen zurück

### invitationService.js - Einladungssystem
- `createInvitation(createdByUid, createdByName)` - Erstellt Einladungstoken
- `validateInvitation(token)` - Prüft ob Token gültig und unbenutzt
- `markInvitationUsed(token, userId, userName)` - Markiert Token als verwendet
- `getInvitations(createdByUid)` - Listet alle Einladungen eines Admins

### authService.js - Passwort-Reset
- `sendPasswordReset(email)` - Sendet Passwort-Reset E-Mail

### Komponenten
- `InviteRegister.jsx` - Registrierungsformular für eingeladene Benutzer (Route: `/invite/:token`)
