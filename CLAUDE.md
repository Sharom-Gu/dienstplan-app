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

### ADMIN-ZUGANG

⚠️ **SICHERHEITSHINWEIS:** Sensible Informationen wie API-Keys und Admin-Passwörter sollten NIEMALS in der Versionskontrolle gespeichert werden! Diese Daten gehören in Umgebungsvariablen oder sichere Verwaltungssysteme.

Admin-Verwaltung erfolgt über die Firebase Console:
- https://console.firebase.google.com → Project: dienstplan-nevpaz
- - Authentication Tab für Benutzerverwaltung
 
  - ## Firebase-Konfiguration
 
  - Projekt-ID: `dienstplan-nevpaz`
 
  - **Umgebungsvariablen** (in `.env.local` und Netlify gespeichert - NICHT im Repository!):
  - - `VITE_FIREBASE_AUTH_DOMAIN`
    - - `VITE_FIREBASE_PROJECT_ID`
      - - `VITE_FIREBASE_STORAGE_BUCKET`
        - - `VITE_FIREBASE_MESSAGING_SENDER_ID`
          - - `VITE_FIREBASE_APP_ID`
            - - `VITE_FIREBASE_API_KEY` (PRIVAT HALTEN!)
             
              - ## Entwicklung
             
              - ### Lokal entwickeln
             
              - ```bash
                cd /Users/sharom/Claude_Program/Dienstplan_Nevpaz

                # Dependencies (falls noetig)
                npm install

                # Dev-Server starten
                npm run dev
                # Laeuft auf http://localhost:3000/
                ```

                ### Aenderungen deployen

                ```bash
                cd /Users/sharom/Claude_Program/Dienstplan_Nevpaz/dienstplan-app

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

                ## Was wurde implementiert

                - **Frontend:** React + Vite
                - - **Backend:** Firebase (Auth + Firestore)
                  - - **Styling:** Dark Theme CSS mit Custom Properties
                    - - **Demo-Modus:** Vollstaendig funktionsfaehig ohne Firebase
                      - - **Hosting:** Netlify (automatisches Deployment via GitHub)
                       
                        - ## Projektstruktur
                       
                        - ```
                          src/
                          ├── components/
                          │   ├── Auth/
                          │   │   ├── Login.jsx
                          │   │   └── InviteRegister.jsx
                          │   ├── Calendar/
                          │   ├── Admin/
                          │   ├── User/
                          │   └── Layout/
                          ├── hooks/
                          ├── services/
                          ├── utils/
                          ├── App.jsx
                          ├── main.jsx
                          └── index.css
                          ```

                          ## Schichtmodell

                          Jeder Mitarbeiter arbeitet 3 Tage/Woche = 20 Stunden:

                          **2x Kurzschicht (6h):**
                          - Früh (09:00-15:00)
                          - - Spät (13:00-19:00)
                           
                            - **1x Langschicht (8h Arbeitszeit):**
                            - - Lang-Früh: 09:00-17:30 (8,5h Anwesenheit, 8h Arbeitszeit)
                              - - Lang-Spät: 10:30-19:00 (8,5h Anwesenheit, 8h Arbeitszeit)
                               
                                - **Kapazitäten:**
                                - - Frühschicht (frueh): 2 Plätze
                                  - - Spätschicht (spaet): 2 Plätze
                                    - - Lang-Früh (lang_frueh): 1 Platz
                                      - - Lang-Spät (lang_spaet): 1 Platz
                                       
                                        - ## Features
                                       
                                        - ### Nutzer-Bereich (3 Ansichten)
                                       
                                        - - **Mein Dienstplan:** Persönlicher Wochenkalender mit eigenen Schichten
                                          - - **Team-Übersicht:** Alle Schichten mit allen Mitarbeitern
                                            - - **Urlaub & Krankheit:** Urlaubstage-Verwaltung
                                             
                                              - ### Admin-Bereich (4 Tabs)
                                             
                                              - - **Kalender-Tab:** Schichtverwaltung, Bulk-Erstellung
                                                - - **Urlaub-Tab:** Urlaubstage und Krankheitsverwaltung
                                                  - - **Benutzer-Tab:** Einladungslinks, Passwortreset, Rollenverwaltung
                                                    - - **Audit-Log-Tab:** Protokoll aller Aktionen
                                                     
                                                      - ### Einladungssystem
                                                     
                                                      - - Admin erstellt Einladungslinks
                                                        - - Nur eingeladene Personen können sich registrieren
                                                          - - Links funktionieren nur einmal
                                                           
                                                            - ## Sicherheit (WICHTIG!)
                                                           
                                                            - ✅ **Sensible Daten NICHT im Repository speichern:**
                                                            - - Keine API-Keys in CLAUDE.md
                                                              - - Keine Admin-Passwörter in CLAUDE.md
                                                                - - Keine privaten Firebase-Credentials in CLAUDE.md
                                                                 
                                                                  - ✅ **Umgebungsvariablen verwenden:**
                                                                  - - `.env.local` für lokale Entwicklung (in .gitignore)
                                                                    - - Netlify Environment Variables für Production
                                                                      - - Firebase Console für Admin-Verwaltung
                                                                       
                                                                        - ## Datenmodell (Firestore Collections)
                                                                       
                                                                        - - **users:** Benutzerdaten (Name, Rolle, Status)
                                                                          - - **shifts:** Schichten (Datum, Zeit, Kapazität)
                                                                            - - **bookings:** Buchungen (Schicht-ID, User-ID, Status)
                                                                              - - **vacations:** Urlaub und Krankheitstage
                                                                                - - **invitations:** Einladungslinks
                                                                                  - - **auditLogs:** Protokoll aller Aktionen
                                                                                   
                                                                                    - ## Neue Services und Funktionen
                                                                                   
                                                                                    - ### shiftService.js
                                                                                    - - `generateMultipleWeeksShifts()` - Bulk-Erstellung
                                                                                      - - `weekHasShifts()` - Prüft ob Woche bereits Schichten hat
                                                                                        - - `deleteAllShifts()` - Löscht alle Schichten
                                                                                          - - `getShiftTypes()` - Gibt Standard-Schichttypen zurück
                                                                                           
                                                                                            - ### invitationService.js
                                                                                            - - `createInvitation()` - Erstellt Einladungstoken
                                                                                              - - `validateInvitation()` - Prüft ob Token gültig und unbenutzt
                                                                                                - - `markInvitationUsed()` - Markiert Token als verwendet
                                                                                                  - - `getInvitations()` - Listet alle Einladungen eines Admins
                                                                                                   
                                                                                                    - ### authService.js
                                                                                                    - - `sendPasswordReset()` - Sendet Passwort-Reset E-Mail
