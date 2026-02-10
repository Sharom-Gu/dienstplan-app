import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { validateInvitation, markInvitationUsed } from '../../services/invitationService';

export function InviteRegister({ token, onSuccess, onBack }) {
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Token beim Laden validieren
  useEffect(() => {
    const checkToken = async () => {
      try {
        const result = await validateInvitation(token);
        if (result.valid) {
          setInviteData({ id: result.inviteId, ...result.invite });
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Fehler beim Validieren des Einladungslinks');
        console.error(err);
      } finally {
        setValidating(false);
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Passwort-Validierung
    if (password !== passwordConfirm) {
      setError('Die Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);

    try {
      // 1. Firebase Auth User erstellen
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Display Name setzen
      await updateProfile(user, { displayName });

      // 3. Firestore User-Dokument erstellen (sofort approved!)
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        email,
        role: 'user',
        status: 'approved', // Direkt freigeschaltet!
        weeklyMinHours: 20,
        vacationDays: 15,
        createdAt: new Date(),
        approvedAt: new Date(),
        invitedBy: inviteData.createdBy
      });

      // 4. Einladung als verwendet markieren
      await markInvitationUsed(inviteData.id, user.uid, displayName);

      // 5. Erfolg melden
      onSuccess();
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Diese E-Mail-Adresse wird bereits verwendet');
      } else if (err.code === 'auth/weak-password') {
        setError('Das Passwort ist zu schwach');
      } else if (err.code === 'auth/invalid-email') {
        setError('Ungültige E-Mail-Adresse');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Ladezustand während Token-Validierung
  if (validating) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Dienstplan</h1>
          <div className="loading-spinner">Einladung wird geprüft...</div>
        </div>
      </div>
    );
  }

  // Fehler: Ungültiger Token
  if (error && !inviteData) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Dienstplan</h1>
          <div className="error-message">{error}</div>
          <button className="btn btn-primary" onClick={onBack}>
            Zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  // Registrierungsformular
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Dienstplan</h1>
        <h2>Willkommen!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Sie wurden eingeladen. Bitte geben Sie Ihre Daten ein.
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="displayName">Ihr Name</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Max Mustermann"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mindestens 6 Zeichen"
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">Passwort bestätigen</label>
            <input
              type="password"
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
              placeholder="Passwort wiederholen"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Wird erstellt...' : 'Konto erstellen'}
          </button>
        </form>
      </div>
    </div>
  );
}
