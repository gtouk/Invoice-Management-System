export function validateReminderSettingsPayload(payload) {
  const errors = [];

  const enabled =
    payload.enabled === undefined || payload.enabled === null
      ? true
      : Boolean(payload.enabled);

  const startAfterDueDays = Number(payload.start_after_due_days);
  const frequencyDays = Number(payload.frequency_days);

  let maxReminders = null;

  if (
    payload.max_reminders !== undefined &&
    payload.max_reminders !== null &&
    payload.max_reminders !== ''
  ) {
    maxReminders = Number(payload.max_reminders);
  }

  const sendTime = payload.send_time || '09:00';

  if (Number.isNaN(startAfterDueDays) || startAfterDueDays < 0) {
    errors.push('Le délai après échéance doit être un nombre positif ou égal à zéro.');
  }

  if (Number.isNaN(frequencyDays) || frequencyDays < 1) {
    errors.push('La fréquence doit être au minimum de 1 jour.');
  }

  if (maxReminders !== null && (Number.isNaN(maxReminders) || maxReminders < 1)) {
    errors.push('Le nombre maximum de rappels doit être vide ou supérieur à zéro.');
  }

  if (!/^\d{2}:\d{2}$/.test(sendTime)) {
    errors.push("L'heure d'envoi doit être au format HH:mm, exemple 09:00.");
  }

  if (!payload.email_subject || payload.email_subject.trim() === '') {
    errors.push("Le sujet de l'email est obligatoire.");
  }

  if (!payload.email_message || payload.email_message.trim() === '') {
    errors.push("Le message de l'email est obligatoire.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      enabled,
      start_after_due_days: startAfterDueDays,
      frequency_days: frequencyDays,
      max_reminders: maxReminders,
      send_time: sendTime,
      email_subject: payload.email_subject?.trim(),
      email_message: payload.email_message?.trim()
    }
  };
}