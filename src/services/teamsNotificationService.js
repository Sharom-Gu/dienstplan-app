// Microsoft Teams Benachrichtigungs-Service
// Sendet Benachrichtigungen an einen Teams-Kanal via Webhook

const TEAMS_WEBHOOK_URL = 'https://defaultc6253557fa0f4d908671e4c3ea9ccf.7c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/63a3ee4af5db4ecc939e745c92c0e08c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xNcmnGq-hVUZc5cym55dhDx48-48bnoeieD5s4BwS2E';

// Basis-Funktion zum Senden von Nachrichten
const sendTeamsMessage = async (title, message, color = '0078D7') => {
  if (!TEAMS_WEBHOOK_URL) {
    console.warn('Teams Webhook URL nicht konfiguriert');
    return false;
  }

  try {
    const payload = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            body: [
              {
                type: 'Container',
                style: 'emphasis',
                items: [
                  {
                    type: 'TextBlock',
                    text: title,
                    weight: 'bolder',
                    size: 'medium',
                    color: 'accent'
                  }
                ]
              },
              {
                type: 'TextBlock',
                text: message,
                wrap: true
              },
              {
                type: 'TextBlock',
                text: `Gesendet: ${new Date().toLocaleString('de-DE')}`,
                size: 'small',
                color: 'light',
                spacing: 'medium'
              }
            ]
          }
        }
      ]
    };

    const response = await fetch(TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Teams Benachrichtigung fehlgeschlagen:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Fehler beim Senden der Teams Benachrichtigung:', error);
    return false;
  }
};

// Benachrichtigung: Neuer Urlaubsantrag
export const notifyVacationRequest = async (userName, startDate, endDate, days, type = 'vacation') => {
  const typeLabel = type === 'sick' ? 'Krankheitsmeldung' :
                    type === 'bildungsurlaub' ? 'Bildungsurlaub' : 'Urlaubsantrag';
  const emoji = type === 'sick' ? '🤒' : type === 'bildungsurlaub' ? '🎓' : '🌴';

  const title = `${emoji} Neuer ${typeLabel}`;
  const message = `**${userName}** hat einen ${typeLabel} eingereicht:\n\n` +
    `- **Zeitraum:** ${formatDate(startDate)} - ${formatDate(endDate)}\n` +
    `- **Tage:** ${days}`;

  return sendTeamsMessage(title, message);
};

// Benachrichtigung: Löschungsantrag
export const notifyDeletionRequest = async (userName, startDate, endDate, type = 'vacation') => {
  const typeLabel = type === 'sick' ? 'Krankheitstag' : 'Urlaub';

  const title = `🗑️ Löschungsantrag`;
  const message = `**${userName}** beantragt die Löschung eines Eintrags:\n\n` +
    `- **Typ:** ${typeLabel}\n` +
    `- **Zeitraum:** ${formatDate(startDate)} - ${formatDate(endDate)}`;

  return sendTeamsMessage(title, message);
};

// Benachrichtigung: Neue Benutzerregistrierung
export const notifyNewUserRegistration = async (userName, email) => {
  const title = `👤 Neue Registrierung`;
  const message = `Ein neuer Benutzer hat sich registriert und wartet auf Freigabe:\n\n` +
    `- **Name:** ${userName}\n` +
    `- **E-Mail:** ${email}`;

  return sendTeamsMessage(title, message);
};

// Benachrichtigung: Storno-Anfrage
export const notifyCancelRequest = async (userName, shiftDate, shiftTime) => {
  const title = `❌ Storno-Anfrage`;
  const message = `**${userName}** möchte eine Schicht stornieren:\n\n` +
    `- **Datum:** ${formatDate(shiftDate)}\n` +
    `- **Zeit:** ${shiftTime}`;

  return sendTeamsMessage(title, message);
};

// Hilfsfunktion: Datum formatieren
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
