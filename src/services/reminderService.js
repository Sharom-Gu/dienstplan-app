// Reminder-Service: Prueft und sendet Erinnerungen fuer Urlaube und Geburtstage (2 Tage vorher)
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { notifyUpcomingVacation, notifyUpcomingBirthday } from './teamsNotificationService';

const REMINDER_DAYS_AHEAD = 2;

// Zieldatum in 2 Tagen berechnen (YYYY-MM-DD)
const getTargetDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + REMINDER_DAYS_AHEAD);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Datum formatieren fuer Anzeige (DD.MM.)
const formatDateShort = (dateStr) => {
  const [, month, day] = dateStr.split('-');
  return `${day}.${month}.`;
};

// Pruefen ob Erinnerung bereits gesendet wurde
const wasReminderSent = async (type, userId, targetDate) => {
  try {
    const q = query(
      collection(db, 'sentReminders'),
      where('type', '==', type),
      where('userId', '==', userId),
      where('targetDate', '==', targetDate)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Fehler beim Pruefen der gesendeten Erinnerungen:', error);
    return true; // Im Fehlerfall nicht senden (sicher)
  }
};

// Erinnerung als gesendet markieren
const markReminderSent = async (type, userId, targetDate) => {
  try {
    await addDoc(collection(db, 'sentReminders'), {
      type,
      userId,
      targetDate,
      sentAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Fehler beim Speichern der Erinnerung:', error);
  }
};

// Hauptfunktion: Prueft und sendet alle faelligen Erinnerungen
export const checkAndSendReminders = async (approvedUsers, vacations) => {
  const targetDate = getTargetDate();
  const targetMonthDay = targetDate.slice(5); // MM-DD

  console.log('[Reminder] Pruefe Erinnerungen fuer Zieldatum:', targetDate);

  // 1. Geburtstage pruefen
  for (const user of approvedUsers) {
    if (!user.birthDate) continue;

    const birthMonthDay = user.birthDate.slice(5); // MM-DD aus YYYY-MM-DD
    if (birthMonthDay !== targetMonthDay) continue;

    const alreadySent = await wasReminderSent('birthday', user.id, targetDate);
    if (alreadySent) {
      console.log('[Reminder] Geburtstag-Erinnerung bereits gesendet fuer:', user.displayName);
      continue;
    }

    console.log('[Reminder] Sende Geburtstag-Erinnerung fuer:', user.displayName);
    const success = await notifyUpcomingBirthday(user.displayName, formatDateShort(targetDate));
    if (success) {
      await markReminderSent('birthday', user.id, targetDate);
    }
  }

  // 2. Urlaube pruefen (nur approved, Typ vacation oder bildungsurlaub)
  for (const vacation of vacations) {
    if (vacation.startDate !== targetDate) continue;
    if (vacation.status !== 'approved') continue;
    if (vacation.type === 'sick') continue;

    const alreadySent = await wasReminderSent('vacation', vacation.userId, targetDate);
    if (alreadySent) {
      console.log('[Reminder] Urlaub-Erinnerung bereits gesendet fuer:', vacation.userName);
      continue;
    }

    console.log('[Reminder] Sende Urlaub-Erinnerung fuer:', vacation.userName);
    const success = await notifyUpcomingVacation(
      vacation.userName,
      vacation.startDate,
      vacation.endDate,
      vacation.days,
      vacation.type
    );
    if (success) {
      await markReminderSent('vacation', vacation.userId, targetDate);
    }
  }

  console.log('[Reminder] Erinnerungs-Check abgeschlossen');
};
