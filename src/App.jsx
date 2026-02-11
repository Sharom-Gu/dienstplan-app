import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useShifts } from './hooks/useShifts';
import { useBookings } from './hooks/useBookings';
import { getPendingUsers, approveUser, rejectUser, revokeUser, changeUserRole, getApprovedUsers, sendPasswordReset, updateUserBirthDate } from './services/authService';
import { getAllVacations, getVacationsForUser, requestVacation, deleteVacation, requestVacationDeletion, approveDeletionRequest, rejectDeletionRequest, updateUserVacationDays, updateUserStartDate, addSickDay } from './services/vacationService';
import { createInvitation, getAllInvitations } from './services/invitationService';
import { Login } from './components/Auth/Login';
import { InviteRegister } from './components/Auth/InviteRegister';
import { Header } from './components/Layout/Header';
import { UserDashboard } from './components/User/UserDashboard';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { startOfWeek, addDays, format } from 'date-fns';

// URL-Parameter auslesen
const getInviteToken = () => {
  const path = window.location.pathname;
  const match = path.match(/^\/invite\/([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
};

// DEMO-MODUS: auf true setzen um Login zu überspringen
// Für Produktion auf false setzen!
const DEMO_MODE = false;

// Demo-Daten für Preview
const createDemoData = () => {
  // Aktuelle Woche und nächste Woche für Demo-Daten
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const nextWeekStart = addDays(currentWeekStart, 7);

  const demoShifts = [];

  // Pro Tag: Frühschicht (2 Plätze), Spätschicht (2 Plätze), EINE Langschicht (1 Platz)
  // Mo, Di, Do: Langschicht 10:30-19:00
  // Mi, Fr: Langschicht 09:00-17:30
  const langSchichtVarianten = [
    { type: 'lang_spaet', startTime: '10:30', endTime: '19:00' },  // Mo
    { type: 'lang_spaet', startTime: '10:30', endTime: '19:00' },  // Di
    { type: 'lang_frueh', startTime: '09:00', endTime: '17:30' },  // Mi
    { type: 'lang_spaet', startTime: '10:30', endTime: '19:00' },  // Do
    { type: 'lang_frueh', startTime: '09:00', endTime: '17:30' },  // Fr
  ];

  // Erstelle Schichten für beide Wochen (aktuelle + nächste)
  const weeks = [
    { prefix: 'current', weekStart: currentWeekStart },
    { prefix: 'next', weekStart: nextWeekStart }
  ];

  weeks.forEach(({ prefix, weekStart }) => {
    for (let day = 0; day < 5; day++) {
      const date = format(addDays(weekStart, day), 'yyyy-MM-dd');

      // Frühschicht (2 Plätze)
      demoShifts.push({
        id: `demo-${prefix}-${day}-0`,
        date,
        type: 'frueh',
        startTime: '09:00',
        endTime: '15:00',
        capacity: 2
      });

      // Spätschicht (2 Plätze)
      demoShifts.push({
        id: `demo-${prefix}-${day}-1`,
        date,
        type: 'spaet',
        startTime: '13:00',
        endTime: '19:00',
        capacity: 2
      });

      // Eine Langschicht pro Tag (1 Platz)
      demoShifts.push({
        id: `demo-${prefix}-${day}-2`,
        date,
        type: langSchichtVarianten[day].type,
        startTime: langSchichtVarianten[day].startTime,
        endTime: langSchichtVarianten[day].endTime,
        capacity: 1
      });
    }
  });

  const demoBookings = [
    // Buchungen für aktuelle Woche
    { id: 'b1', shiftId: 'demo-current-0-0', userId: 'demo-user', userName: 'Max Mustermann', status: 'active' },
    { id: 'b2', shiftId: 'demo-current-2-1', userId: 'demo-user', userName: 'Max Mustermann', status: 'active' },
    { id: 'b3', shiftId: 'demo-current-4-2', userId: 'demo-user', userName: 'Max Mustermann', status: 'active' },
    { id: 'b4', shiftId: 'demo-current-1-0', userId: 'user2', userName: 'Anna Schmidt', status: 'active' },
    { id: 'b5', shiftId: 'demo-current-3-1', userId: 'user3', userName: 'Lisa Weber', status: 'active' },
    // Buchungen für nächste Woche
    { id: 'b6', shiftId: 'demo-next-0-0', userId: 'demo-user', userName: 'Max Mustermann', status: 'active' },
    { id: 'b7', shiftId: 'demo-next-1-1', userId: 'demo-user', userName: 'Max Mustermann', status: 'active' },
    { id: 'b8', shiftId: 'demo-next-2-0', userId: 'user2', userName: 'Anna Schmidt', status: 'active', customStartTime: '10:00', customEndTime: '14:00' },
    { id: 'b9', shiftId: 'demo-next-0-2', userId: 'user3', userName: 'Lisa Weber', status: 'active' },
    { id: 'b10', shiftId: 'demo-next-1-0', userId: 'user4', userName: 'Tom Müller', status: 'active' },
    { id: 'b11', shiftId: 'demo-next-3-1', userId: 'user5', userName: 'Sarah Koch', status: 'active' },
  ];

  // Liste aller Mitarbeiter für Admin-Zuweisung
  const demoEmployees = [
    { id: 'demo-user', name: 'Max Mustermann' },
    { id: 'user2', name: 'Anna Schmidt' },
    { id: 'user3', name: 'Lisa Weber' },
    { id: 'user4', name: 'Tom Müller' },
    { id: 'user5', name: 'Sarah Koch' },
    { id: 'user6', name: 'Peter Becker' },
    { id: 'user7', name: 'Julia Hoffmann' },
  ];

  // Ausstehende Benutzer-Registrierungen
  const demoPendingUsers = [
    {
      id: 'pending-user1',
      displayName: 'Neue Mitarbeiterin',
      email: 'neue@example.com',
      createdAt: new Date()
    },
    {
      id: 'pending-user2',
      displayName: 'Praktikant Schmidt',
      email: 'praktikant@example.com',
      createdAt: new Date(Date.now() - 86400000) // 1 Tag vorher
    },
  ];

  // Genehmigte Benutzer (aktive Mitarbeiter) mit Urlaubstagen
  const demoApprovedUsers = [
    { id: 'demo-user', displayName: 'Max Mustermann', email: 'max@example.com', role: 'user', vacationDays: 15, approvedAt: new Date(Date.now() - 30 * 86400000) },
    { id: 'user2', displayName: 'Anna Schmidt', email: 'anna@example.com', role: 'user', vacationDays: 15, approvedAt: new Date(Date.now() - 25 * 86400000) },
    { id: 'user3', displayName: 'Lisa Weber', email: 'lisa@example.com', role: 'user', vacationDays: 15, approvedAt: new Date(Date.now() - 20 * 86400000) },
    { id: 'user4', displayName: 'Tom Müller', email: 'tom@example.com', role: 'user', vacationDays: 12, employmentStartDate: '2026-04-01', approvedAt: new Date(Date.now() - 15 * 86400000) },
    { id: 'user5', displayName: 'Sarah Koch', email: 'sarah@example.com', role: 'user', vacationDays: 15, approvedAt: new Date(Date.now() - 10 * 86400000) },
    { id: 'user6', displayName: 'Peter Becker', email: 'peter@example.com', role: 'admin', vacationDays: 15, approvedAt: new Date(Date.now() - 60 * 86400000) },
    { id: 'user7', displayName: 'Julia Hoffmann', email: 'julia@example.com', role: 'user', vacationDays: 15, approvedAt: new Date(Date.now() - 5 * 86400000) },
  ];

  // Demo Urlaube und Krankheitstage
  const currentYear = new Date().getFullYear();
  const demoVacations = [
    { id: 'v1', userId: 'demo-user', userName: 'Max Mustermann', startDate: `${currentYear}-03-15`, endDate: `${currentYear}-03-22`, days: 6, type: 'vacation', status: 'approved', note: 'Familienurlaub' },
    { id: 'v2', userId: 'demo-user', userName: 'Max Mustermann', startDate: `${currentYear}-07-01`, endDate: `${currentYear}-07-12`, days: 10, type: 'vacation', status: 'approved', note: 'Sommerurlaub' },
    { id: 'v3', userId: 'user2', userName: 'Anna Schmidt', startDate: `${currentYear}-02-10`, endDate: `${currentYear}-02-14`, days: 5, type: 'vacation', status: 'approved' },
    { id: 'v4', userId: 'user3', userName: 'Lisa Weber', startDate: `${currentYear}-04-21`, endDate: `${currentYear}-04-25`, days: 5, type: 'vacation', status: 'approved', note: 'Ostern' },
    { id: 'v5', userId: 'user5', userName: 'Sarah Koch', startDate: `${currentYear}-06-15`, endDate: `${currentYear}-06-28`, days: 10, type: 'vacation', status: 'approved', note: 'Hochzeitsreise' },
    // Krankheitstage
    { id: 's1', userId: 'demo-user', userName: 'Max Mustermann', startDate: `${currentYear}-01-20`, endDate: `${currentYear}-01-22`, days: 3, type: 'sick', status: 'approved', note: 'Erkältung' },
    { id: 's2', userId: 'user4', userName: 'Tom Müller', startDate: `${currentYear}-02-05`, endDate: `${currentYear}-02-07`, days: 3, type: 'sick', status: 'approved', note: 'Grippe' },
    { id: 's3', userId: 'user2', userName: 'Anna Schmidt', startDate: `${currentYear}-01-15`, endDate: `${currentYear}-01-15`, days: 1, type: 'sick', status: 'approved' },
  ];

  return { demoShifts, demoBookings, demoEmployees, demoPendingUsers, demoApprovedUsers, demoVacations, currentWeekStart };
};

export default function App() {
  const { user, userData, loading: authLoading, login, logout, isAdmin } = useAuth();
  const [activeView, setActiveView] = useState('calendar');
  // Demo-Woche startet bei aktueller Woche
  const [demoWeekStart, setDemoWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [demoViewMode, setDemoViewMode] = useState('user'); // 'admin' oder 'user'

  // Einladungslink-Handling
  const [inviteToken, setInviteToken] = useState(() => getInviteToken());
  const [invitations, setInvitations] = useState([]);

  const demoData = useMemo(() => createDemoData(), []);

  const {
    shifts,
    loading: shiftsLoading,
    currentWeekStart,
    goToNextWeek,
    goToPrevWeek,
    goToCurrentWeek,
    addShift,
    editShift,
    removeShift,
    generateWeek,
    generateMultipleWeeks,
    clearAllShifts,
    refresh: refreshShifts
  } = useShifts();

  const {
    bookings,
    loading: bookingsLoading,
    book,
    cancel,
    refresh: refreshBookings
  } = useBookings(shifts, user?.uid);

  // Audit-Logs für Admin (wir behalten nur das)
  const [auditLogs, setAuditLogs] = useState([]);

  // Pending users management for admin
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsersList, setApprovedUsersList] = useState([]);
  const [employees, setEmployees] = useState([]);

  const refreshPendingUsers = useCallback(async () => {
    if (isAdmin) {
      try {
        const users = await getPendingUsers();
        setPendingUsers(users);
      } catch (err) {
        console.error('Error fetching pending users:', err);
      }
    }
  }, [isAdmin]);

  const refreshApprovedUsers = useCallback(async () => {
    // Lade genehmigte Benutzer für alle eingeloggten User (für Mitarbeiter-Filter)
    if (user) {
      try {
        const users = await getApprovedUsers();
        setApprovedUsersList(users);
        setEmployees(users.map(u => ({ id: u.id, name: u.displayName })));
      } catch (err) {
        console.error('Error fetching approved users:', err);
      }
    }
  }, [user]);

  // Fetch pending users for admin, employees for all users
  useEffect(() => {
    if (user) {
      refreshApprovedUsers();
      if (isAdmin) {
        refreshPendingUsers();
      }
    }
  }, [user, isAdmin, refreshPendingUsers, refreshApprovedUsers]);

  const handleApproveUser = async (userId, role) => {
    await approveUser(userId, role);
    await refreshPendingUsers();
    await refreshApprovedUsers();
  };

  const handleRejectUser = async (userId) => {
    await rejectUser(userId);
    await refreshPendingUsers();
  };

  const handleRevokeUser = async (userId) => {
    await revokeUser(userId);
    await refreshApprovedUsers();
  };

  const handleChangeUserRole = async (userId, newRole) => {
    await changeUserRole(userId, newRole);
    await refreshApprovedUsers();
  };

  // Vacation management
  const [vacations, setVacations] = useState([]);
  const [userVacations, setUserVacations] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const refreshVacations = useCallback(async () => {
    try {
      const allVacs = await getAllVacations();
      setVacations(allVacs);
      if (user?.uid) {
        const userVacs = await getVacationsForUser(user.uid);
        setUserVacations(userVacs);
      }
    } catch (err) {
      console.error('Error fetching vacations:', err);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      refreshVacations();
    }
  }, [user, refreshVacations]);

  const handleSubmitVacation = async (startDate, endDate, note) => {
    await requestVacation(user.uid, userData?.displayName, startDate, endDate, note, 'vacation');
    await refreshVacations();
  };

  const handleSubmitSickDay = async (startDate, endDate, note) => {
    const result = await requestVacation(user.uid, userData?.displayName, startDate, endDate, note, 'sick');
    await refreshVacations();
    await refreshBookings(); // Buchungen aktualisieren (könnten storniert worden sein)
    return result; // Gibt cancelledBookings zurück
  };

  const handleAddSickDay = async (userId, userName, startDate, endDate, note) => {
    const result = await addSickDay(userId, userName, startDate, endDate, note);
    await refreshVacations();
    await refreshBookings();
    return result;
  };

  const handleDeleteVacation = async (vacationId) => {
    await deleteVacation(vacationId);
    await refreshVacations();
  };

  // User beantragt Löschung
  const handleRequestDeletion = async (vacationId) => {
    await requestVacationDeletion(vacationId);
    await refreshVacations();
  };

  // Admin genehmigt Löschung
  const handleApproveDeletion = async (vacationId) => {
    await approveDeletionRequest(vacationId);
    await refreshVacations();
  };

  // Admin lehnt Löschung ab
  const handleRejectDeletion = async (vacationId) => {
    await rejectDeletionRequest(vacationId);
    await refreshVacations();
  };

  // User aktualisiert Geburtsdatum
  const handleUpdateBirthDate = async (birthDate) => {
    await updateUserBirthDate(user.uid, birthDate);
    await refreshApprovedUsers(); // Aktualisiert die Mitarbeiterliste
  };

  const handleUpdateEmployee = async (userId, data) => {
    if (data.vacationDays !== undefined) {
      await updateUserVacationDays(userId, data.vacationDays);
    }
    if (data.employmentStartDate !== undefined) {
      await updateUserStartDate(userId, data.employmentStartDate);
    }
    await refreshApprovedUsers();
  };

  // Einladungen laden (nur für Admin)
  const refreshInvitations = useCallback(async () => {
    if (isAdmin) {
      try {
        const invites = await getAllInvitations();
        setInvitations(invites);
      } catch (err) {
        console.error('Error fetching invitations:', err);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      refreshInvitations();
    }
  }, [isAdmin, refreshInvitations]);

  // Neue Einladung erstellen
  const handleCreateInvitation = async () => {
    try {
      const result = await createInvitation(user.uid, userData.displayName);
      const inviteUrl = `${window.location.origin}/invite/${result.token}`;
      await refreshInvitations();
      return inviteUrl;
    } catch (err) {
      console.error('Error creating invitation:', err);
      throw err;
    }
  };

  // Nach erfolgreicher Registrierung über Einladung
  const handleInviteSuccess = () => {
    // URL bereinigen und zur normalen App zurückkehren
    window.history.pushState({}, '', '/');
    setInviteToken(null);
  };

  const handleInviteBack = () => {
    window.history.pushState({}, '', '/');
    setInviteToken(null);
  };

  // Refresh data when shifts change
  useEffect(() => {
    if (shifts.length > 0) {
      refreshBookings();
    }
  }, [shifts, refreshBookings]);

  const refreshAll = async () => {
    await Promise.all([refreshShifts(), refreshBookings(), refreshPendingUsers(), refreshApprovedUsers(), refreshVacations(), refreshInvitations()]);
  };

  // Demo-Modus Navigation Funktionen
  const demoPrevWeek = () => setDemoWeekStart(prev => addDays(prev, -7));
  const demoNextWeek = () => setDemoWeekStart(prev => addDays(prev, 7));
  const demoCurrentWeek = () => setDemoWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // DEMO-MODUS: Zeige Dashboard direkt ohne Login
  if (DEMO_MODE) {
    const demoUserData = demoViewMode === 'admin'
      ? { id: 'demo-admin', name: 'Demo Admin', displayName: 'Demo Admin', role: 'admin', minHours: 20 }
      : { id: 'demo-user', name: 'Max Mustermann', displayName: 'Max Mustermann', role: 'user', weeklyMinHours: 20 };

    return (
      <div className="app">
        <Header userData={demoUserData} onLogout={() => alert('Demo-Modus: Logout deaktiviert')} />
        <div style={{ background: '#fff3cd', padding: '10px', textAlign: 'center', borderBottom: '1px solid #ffc107', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
          <strong>DEMO-MODUS</strong>
          <span>|</span>
          <button
            onClick={() => setDemoViewMode('user')}
            style={{
              padding: '0.25rem 0.75rem',
              background: demoViewMode === 'user' ? '#2563eb' : '#e2e8f0',
              color: demoViewMode === 'user' ? 'white' : '#1e293b',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Nutzer-Ansicht
          </button>
          <button
            onClick={() => setDemoViewMode('admin')}
            style={{
              padding: '0.25rem 0.75rem',
              background: demoViewMode === 'admin' ? '#2563eb' : '#e2e8f0',
              color: demoViewMode === 'admin' ? 'white' : '#1e293b',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Admin-Ansicht
          </button>
        </div>
        <main className="app-main">
          {demoViewMode === 'admin' ? (
            <AdminDashboard
              userData={demoUserData}
              shifts={demoData.demoShifts}
              bookings={demoData.demoBookings}
              currentWeekStart={demoWeekStart}
              employees={demoData.demoEmployees}
              pendingUsers={demoData.demoPendingUsers}
              approvedUsers={demoData.demoApprovedUsers}
              vacations={demoData.demoVacations}
              currentYear={new Date().getFullYear()}
              auditLogs={[]}
              loading={false}
              onPrevWeek={demoPrevWeek}
              onNextWeek={demoNextWeek}
              onCurrentWeek={demoCurrentWeek}
              onAddShift={() => alert('Demo: Schicht hinzufügen')}
              onEditShift={() => alert('Demo: Schicht bearbeiten')}
              onDeleteShift={() => alert('Demo: Schicht löschen')}
              onGenerateWeek={() => alert('Demo: Woche generieren')}
              onEditBookingTime={(bookingId, start, end) => alert(`Demo: Zeit für ${bookingId} geändert zu ${start} - ${end}`)}
              onAssignEmployee={(shiftId, odId, empName) => alert(`Demo: ${empName} wurde der Schicht zugewiesen`)}
              onApproveUser={(userId, role) => alert(`Demo: Benutzer ${userId} wurde als ${role} freigegeben`)}
              onRejectUser={(userId) => alert(`Demo: Benutzer ${userId} wurde abgelehnt`)}
              onRevokeUser={(userId) => alert(`Demo: Zugang für Benutzer ${userId} wurde entzogen`)}
              onChangeUserRole={(userId, role) => alert(`Demo: Rolle für Benutzer ${userId} wurde zu ${role} geändert`)}
              onDeleteVacation={(vacationId) => alert(`Demo: Urlaub ${vacationId} gelöscht`)}
              onUpdateEmployee={(userId, data) => alert(`Demo: Mitarbeiter ${userId} aktualisiert`)}
              onAddSickDay={(userId, userName, start, end, note) => alert(`Demo: Krankheit für ${userName} von ${start} bis ${end} eingetragen`)}
              refreshAll={() => {}}
            />
          ) : (
            <UserDashboard
              userData={{ ...demoUserData, vacationDays: 15 }}
              shifts={demoData.demoShifts}
              bookings={demoData.demoBookings}
              vacations={demoData.demoVacations.filter(v => v.userId === 'demo-user')}
              allVacations={demoData.demoVacations}
              currentWeekStart={demoWeekStart}
              currentYear={new Date().getFullYear()}
              loading={false}
              onPrevWeek={demoPrevWeek}
              onNextWeek={demoNextWeek}
              onCurrentWeek={demoCurrentWeek}
              onPrevYear={() => {}}
              onNextYear={() => {}}
              onBook={() => alert('Demo: Schicht buchen')}
              onCancelRequest={() => alert('Demo: Storno anfragen')}
              onSwapRequest={() => alert('Demo: Tausch anfragen')}
              onSubmitVacation={(start, end, note) => alert(`Demo: Urlaub von ${start} bis ${end} eingereicht`)}
              onSubmitSickDay={(start, end, note) => alert(`Demo: Krankheit von ${start} bis ${end} eingetragen`)}
              onDeleteVacation={(id) => alert(`Demo: Eintrag ${id} gelöscht`)}
              refreshBookings={() => {}}
            />
          )}
        </main>
      </div>
    );
  }

  // Show loading state
  if (authLoading) {
    return (
      <div className="app loading">
        <div className="loading-spinner">Laden...</div>
      </div>
    );
  }

  // Show invite registration if invite token is present
  if (inviteToken) {
    return (
      <div className="app">
        <InviteRegister
          token={inviteToken}
          onSuccess={handleInviteSuccess}
          onBack={handleInviteBack}
        />
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <div className="app">
        <Login onLogin={login} />
      </div>
    );
  }

  const loading = shiftsLoading || bookingsLoading;

  return (
    <div className="app">
      <Header userData={userData} onLogout={logout} />

      <main className="app-main">
        {isAdmin ? (
          <AdminDashboard
            userData={userData}
            shifts={shifts}
            bookings={bookings}
            currentWeekStart={currentWeekStart}
            pendingUsers={pendingUsers}
            approvedUsers={approvedUsersList}
            employees={employees}
            invitations={invitations}
            vacations={vacations}
            currentYear={currentYear}
            auditLogs={auditLogs}
            loading={loading}
            onPrevWeek={goToPrevWeek}
            onNextWeek={goToNextWeek}
            onCurrentWeek={goToCurrentWeek}
            onAddShift={addShift}
            onEditShift={editShift}
            onDeleteShift={removeShift}
            onGenerateMultipleWeeks={generateMultipleWeeks}
            onClearAllShifts={clearAllShifts}
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
            onRevokeUser={handleRevokeUser}
            onChangeUserRole={handleChangeUserRole}
            onCreateInvitation={handleCreateInvitation}
            onResetPassword={sendPasswordReset}
            onDeleteVacation={handleDeleteVacation}
            onApproveDeletion={handleApproveDeletion}
            onRejectDeletion={handleRejectDeletion}
            onUpdateEmployee={handleUpdateEmployee}
            onAddSickDay={handleAddSickDay}
            refreshAll={refreshAll}
          />
        ) : (
          <UserDashboard
            userData={userData}
            shifts={shifts}
            bookings={bookings}
            employees={employees}
            vacations={userVacations}
            allVacations={vacations}
            currentWeekStart={currentWeekStart}
            currentYear={currentYear}
            loading={loading}
            onPrevWeek={goToPrevWeek}
            onNextWeek={goToNextWeek}
            onCurrentWeek={goToCurrentWeek}
            onPrevYear={() => setCurrentYear(y => y - 1)}
            onNextYear={() => setCurrentYear(y => y + 1)}
            onBook={book}
            onCancelRequest={cancel}
            onSubmitVacation={handleSubmitVacation}
            onSubmitSickDay={handleSubmitSickDay}
            onRequestDeletion={handleRequestDeletion}
            onUpdateBirthDate={handleUpdateBirthDate}
            refreshBookings={refreshBookings}
          />
        )}
      </main>
    </div>
  );
}
