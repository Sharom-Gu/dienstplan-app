# Dienstplan-App - Projekt-Status

## Aktueller Stand (01.02.2026)

### Was wurde implementiert
Die komplette Dienstplan-App ist fertig implementiert:

- **Frontend**: React + Vite
- **Backend**: Firebase (Auth + Firestore)
- **Styling**: Dark Theme CSS mit Custom Properties
- **Demo-Modus**: Vollständig funktionsfähig ohne Firebase

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
├── firebase/firestore.rules
└── Konfigurationsdateien
```

### Demo-Modus
Die App startet standardmäßig im Demo-Modus (`DEMO_MODE = true` in App.jsx).
- Kein Login erforderlich
- Umschalten zwischen Nutzer- und Admin-Ansicht
- Alle Features testbar mit Demo-Daten
- Demo-Daten für aktuelle UND nächste Woche
- Wochen-Navigation funktioniert vollständig

### Schichtmodell
Jeder Mitarbeiter arbeitet 3 Tage/Woche = 20 Stunden:
- **2x Kurzschicht (6h)**: Früh (09:00-15:00) oder Spät (13:00-19:00)
- **1x Langschicht (8h Arbeitszeit)**: Mit 30 Min. Pause (wird nicht mitgezählt)
  - Mo, Di, Do: 10:30-19:00 (8,5h Anwesenheit, 8h Arbeitszeit)
  - Mi, Fr: 09:00-17:30 (8,5h Anwesenheit, 8h Arbeitszeit)

Kapazitäten:
- Frühschicht: 2 Plätze
- Spätschicht: 2 Plätze
- Langschicht: 1 Platz (nur eine pro Tag)

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
   - "Woche generieren" für Standardschichten
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
   - **Ausstehende Registrierungen**: Neue Benutzer freigeben/ablehnen
   - **Aktive Benutzer**: Alle genehmigten Mitarbeiter
     - Rolle ändern (Benutzer/Admin)
     - Zugang entziehen
   - Rollen-Badges (Admin = gelb, Benutzer = cyan)

4. **Audit-Log-Tab**
   - Protokoll aller Aktionen

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

### Benutzer-Registrierung
1. Neuer Benutzer registriert sich → Status "pending"
2. Admin sieht Anfrage im "Benutzer"-Tab
3. Admin wählt Rolle und klickt "Freigeben" → Status "approved"
4. Benutzer kann sich jetzt einloggen

Status-Typen:
- `pending` - Wartet auf Admin-Freigabe
- `approved` - Freigegeben, kann sich einloggen
- `rejected` - Abgelehnt
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

### Wichtige Befehle
```bash
# Im Projektverzeichnis:
cd /Users/sharom/Claude_Program/Dienstplan_Nevpaz/dienstplan-app

# Dependencies installieren
npm install

# Dev-Server starten (Demo-Modus)
npm run dev

# Build erstellen
npm run build

# Firebase Emulators starten (benötigt Java)
firebase emulators:start
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

### Konfiguration
- `.env.local` - Firebase-Konfiguration
- `firebase.json` - Emulator-Ports (Auth: 9099, Firestore: 8080, UI: 4000)
- `DEMO_MODE` in `App.jsx` - Demo-Modus an/aus

### Hinweise
- Demo-Modus zeigt Schichten für aktuelle UND nächste Woche
- "Heute" Button springt zur aktuellen Woche
- Buchungen werden sofort bestätigt (keine Genehmigung erforderlich)
- Vergangene Schichten können nicht mehr gebucht werden
- Wochenenden können nicht als Urlaubs-/Krankheitsdatum gewählt werden
