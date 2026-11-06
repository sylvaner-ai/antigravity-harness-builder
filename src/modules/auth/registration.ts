/**
 * Les inscriptions sont fermées par défaut (usage interne).
 * Elles ne s'ouvrent que si ALLOW_REGISTRATION vaut exactement « true ».
 */
export function isRegistrationAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_REGISTRATION === 'true';
}
