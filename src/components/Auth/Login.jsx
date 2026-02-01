import { useState } from 'react';

export function Login({ onLogin, onRegister, error }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setRegistrationSuccess(false);
    setLoading(true);

    try {
      if (isRegister) {
        await onRegister(email, password, displayName);
        setRegistrationSuccess(true);
        setEmail('');
        setPassword('');
        setDisplayName('');
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Dienstplan</h1>
        <h2>{isRegister ? 'Registrieren' : 'Anmelden'}</h2>

        {displayError && <div className="error-message">{displayError}</div>}

        {registrationSuccess && (
          <div className="success-message">
            Registrierung erfolgreich! Ihr Konto muss nun vom Administrator freigegeben werden.
            Sie erhalten eine Benachrichtigung, sobald Ihr Zugang aktiviert wurde.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="displayName">Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required={isRegister}
                placeholder="Max Mustermann"
              />
            </div>
          )}

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

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Laden...' : isRegister ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>

        <div className="login-toggle">
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setIsRegister(!isRegister);
              setLocalError('');
            }}
          >
            {isRegister
              ? 'Bereits registriert? Anmelden'
              : 'Noch kein Konto? Registrieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
