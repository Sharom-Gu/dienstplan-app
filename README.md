# Dienstplan-App

Eine minimalistische webbasierte Dienstplan-Anwendung für Werkstudenten mit Admin-Bereich.

## Features

- **Wochenansicht**: Übersichtliche Darstellung aller Schichten (Mo-Fr)
- **Schichtbuchung**: Mitarbeiter können freie Schichten buchen
- **Storno-Anfragen**: Gebuchte Schichten können über Anfrage storniert werden
- **Tausch-Anfragen**: Schichten können getauscht werden
- **Admin-Dashboard**: Verwaltung von Schichten, Genehmigung von Anfragen
- **Audit-Log**: Vollständige Protokollierung aller Aktionen
- **Wochenstunden-Tracking**: Anzeige der gebuchten Stunden pro Woche

## Tech-Stack

- React + Vite
- Firebase (Authentication + Firestore)
- date-fns (Datumshandling)
- Plain CSS (minimalistisch)

## Setup

### Voraussetzungen

- Node.js (v18+)
- npm oder yarn
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. **Repository klonen und Abhängigkeiten installieren**:
   ```bash
   cd dienstplan-app
   npm install
   ```

2. **Firebase-Konfiguration**:
   - Kopiere `.env.example` zu `.env.local`
   - Fülle die Firebase-Credentials aus (oder nutze die Emulator-Konfiguration)

   ```bash
   cp .env.example .env.local
   ```

3. **Firebase Emulators starten** (für lokale Entwicklung):
   ```bash
   firebase emulators:start
   ```

4. **Entwicklungsserver starten**:
   ```bash
   npm run dev
   ```

5. **App öffnen**: http://localhost:3000

## Verwendung

### Erste Schritte (mit Emulatoren)

1. **Admin-Benutzer registrieren**:
   - Öffne die App unter http://localhost:3000
   - Klicke auf "Noch kein Konto? Registrieren"
   - Wähle die Rolle "Admin"

2. **Schichten erstellen**:
   - Als Admin eingeloggt, klicke auf "Woche generieren" für Standardschichten
   - Oder erstelle einzelne Schichten mit "+ Neue Schicht"

3. **Weiteren Benutzer anlegen**:
   - Melde dich ab und registriere einen User-Account (Rolle: Benutzer)

4. **Schichten buchen**:
   - Als User eingeloggt, klicke auf "Buchen" bei einer freien Schicht

5. **Storno testen**:
   - Klicke auf "Storno" bei einer gebuchten Schicht
   - Als Admin unter "Anfragen" genehmigen oder ablehnen

### Schichttypen

- **Früh**: 08:00 - 12:00 Uhr
- **Spät**: 13:00 - 17:00 Uhr
- **Mitte**: 10:00 - 14:00 Uhr
- **Benutzerdefiniert**: Frei wählbare Zeiten

## Projektstruktur

```
dienstplan-app/
├── public/                 # Statische Dateien
├── src/
│   ├── components/         # React-Komponenten
│   │   ├── Admin/          # Admin-spezifische Komponenten
│   │   ├── Auth/           # Login/Registrierung
│   │   ├── Calendar/       # Kalender-Ansicht
│   │   ├── Layout/         # Header, Navigation
│   │   └── User/           # User-Dashboard
│   ├── hooks/              # React Hooks
│   ├── services/           # Firebase-Services
│   ├── utils/              # Hilfsfunktionen
│   ├── App.jsx             # Haupt-App-Komponente
│   ├── main.jsx            # Entry Point
│   └── index.css           # Globale Styles
├── firebase/
│   └── firestore.rules     # Firestore Security Rules
├── firebase.json           # Firebase-Konfiguration
└── package.json            # Dependencies
```

## Datenmodell

### Collections

- **users**: Benutzerdaten (Name, Rolle, Min-Stunden)
- **shifts**: Schichten (Datum, Zeit, Kapazität)
- **bookings**: Buchungen (Schicht-ID, User-ID, Status)
- **requests**: Storno-/Tausch-Anfragen
- **auditLogs**: Audit-Protokoll

## Entwicklung

### Verfügbare Scripts

```bash
npm run dev        # Entwicklungsserver starten
npm run build      # Produktions-Build erstellen
npm run preview    # Build lokal testen
npm run emulators  # Firebase Emulators starten
```

### Firebase Emulator UI

Die Emulator-UI ist unter http://localhost:4000 erreichbar. Hier können:
- Benutzer direkt in der Auth-Datenbank angelegt werden
- Firestore-Daten inspiziert und bearbeitet werden

## Deployment

1. Firebase-Projekt erstellen unter https://console.firebase.google.com
2. Authentication aktivieren (Email/Password)
3. Firestore erstellen
4. Security Rules deployen:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. Hosting einrichten:
   ```bash
   firebase init hosting
   npm run build
   firebase deploy --only hosting
   ```

## Lizenz

MIT
