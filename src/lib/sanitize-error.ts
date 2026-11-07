/**
 * Sanitise un message d'erreur pour s'assurer qu'aucun secret (clé API, token Bearer, mot de passe DB)
 * ni document confidentiel brut ne soit persisté dans les journaux techniques (§7 FR-10, §9 & §12).
 */
export function sanitizeErrorMessage(rawError: unknown): {
  code: string;
  message: string;
  occurredAt: string;
} {
  const rawMessage =
    rawError instanceof Error
      ? rawError.message
      : typeof rawError === 'string'
        ? rawError
        : 'Unknown processing error';

  const errorCode =
    rawError && typeof rawError === 'object' && 'code' in rawError && typeof rawError.code === 'string'
      ? rawError.code
      : 'JOB_EXECUTION_ERROR';

  // Masquage systématique des motifs de clés API, tokens et URLs de connexion avec mot de passe
  const redactedMessage = rawMessage
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gh[pousr]_[0-9A-Za-z]{20,}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/Bearer\s+[0-9A-Za-z\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/(postgresql:\/\/[^:]+:)[^@]+(@)/gi, '$1[REDACTED_PASSWORD]$2')
    .slice(0, 600);

  return {
    code: errorCode,
    message: redactedMessage,
    occurredAt: new Date().toISOString(),
  };
}
