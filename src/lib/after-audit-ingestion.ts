/**
 * Après l'import d'un export d'audit complet : si un cahier des charges y était joint, lance aussitôt
 * l'extraction du profil (fusion audit + cahier) et renvoie la page où poursuivre.
 * En cas d'échec de l'extraction, renvoie vers l'étape d'import, où elle peut être relancée.
 */
export async function nextStepAfterAuditIngestion(
  projectId: string,
  ingestion: { hasSpecification?: boolean },
  onExtracting?: () => void
): Promise<string> {
  if (!ingestion.hasSpecification) return `/projects/${projectId}/step-profile`;
  onExtracting?.();
  try {
    const res = await fetch(`/api/projects/${projectId}/extract-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return res.ok ? `/projects/${projectId}/step-profile` : `/projects/${projectId}/step-import`;
  } catch {
    return `/projects/${projectId}/step-import`;
  }
}
