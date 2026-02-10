import { useState } from 'react';
import { WeekView } from '../Calendar/WeekView';
import { WeeklyHours } from './WeeklyHours';
import { PersonalSchedule } from './PersonalSchedule';
import { VacationView } from './VacationView';

export function UserDashboard({
  userData,
  shifts,
  bookings,
  employees = [],
  vacations = [],
  allVacations = [],
  currentWeekStart,
  currentYear,
  loading,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onPrevYear,
  onNextYear,
  onBook,
  onCancelRequest,
  onSwapRequest,
  onSubmitVacation,
  onSubmitSickDay,
  onRequestDeletion,
  refreshBookings
}) {
  const [activeView, setActiveView] = useState('team'); // 'team', 'personal', oder 'vacation'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [showFreeShifts, setShowFreeShifts] = useState(false);

  // Zeige Wochenstunden nur wenn kein anderer Nutzer ausgewählt ist (leer oder eigene ID)
  const showOwnHours = !selectedUserId || selectedUserId === userData?.id;

  return (
    <div className="user-dashboard">
      {/* Ansicht-Umschalter */}
      <div className="view-toggle-container">
        <div className="view-toggle">
          <button
            className={activeView === 'personal' ? 'active' : ''}
            onClick={() => setActiveView('personal')}
          >
            Mein Dienstplan
          </button>
          <button
            className={activeView === 'team' ? 'active' : ''}
            onClick={() => setActiveView('team')}
          >
            Team-Übersicht
          </button>
          <button
            className={activeView === 'vacation' ? 'active' : ''}
            onClick={() => setActiveView('vacation')}
          >
            Urlaub / Krankheit
          </button>
        </div>
      </div>

      {activeView === 'vacation' ? (
        /* Urlaubsansicht */
        <VacationView
          userData={userData}
          vacations={vacations}
          allVacations={allVacations}
          currentYear={currentYear || new Date().getFullYear()}
          onPrevYear={onPrevYear}
          onNextYear={onNextYear}
          onSubmitVacation={onSubmitVacation}
          onSubmitSickDay={onSubmitSickDay}
          onRequestDeletion={onRequestDeletion}
        />
      ) : activeView === 'personal' ? (
        /* Persönlicher Dienstplan */
        <PersonalSchedule
          currentWeekStart={currentWeekStart}
          shifts={shifts}
          bookings={bookings}
          userId={userData?.id}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
          onCurrentWeek={onCurrentWeek}
        />
      ) : (
        /* Team-Ansicht */
        <>
          <div className="user-filter">
            <label htmlFor="user-select">Mitarbeiter anzeigen:</label>
            <select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">-- Alle Mitarbeiter --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <button
              className={`btn ${showFreeShifts ? 'btn-success' : 'btn-secondary'}`}
              onClick={() => setShowFreeShifts(!showFreeShifts)}
            >
              {showFreeShifts ? 'Freie Schichten ✓' : 'Freie Schichten'}
            </button>
          </div>

          {showOwnHours && (
            <WeeklyHours
              shifts={shifts}
              bookings={bookings}
              vacations={allVacations}
              userId={userData?.id}
              minHours={userData?.weeklyMinHours || 20}
              currentWeekStart={currentWeekStart}
            />
          )}

          <WeekView
            currentWeekStart={currentWeekStart}
            shifts={shifts}
            bookings={bookings}
            userId={userData?.id}
            userName={userData?.displayName}
            selectedUserId={selectedUserId}
            showFreeShifts={showFreeShifts}
            isAdmin={false}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
            onCurrentWeek={onCurrentWeek}
            onBook={async (shiftId, userName) => {
              await onBook(shiftId, userName);
              await refreshBookings();
            }}
            onCancelRequest={async (bookingId) => {
              await onCancelRequest(bookingId);
              await refreshBookings();
            }}
            onSwapRequest={onSwapRequest}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
