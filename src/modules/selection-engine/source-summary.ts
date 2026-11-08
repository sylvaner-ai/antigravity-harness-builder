import { CURATED_SOURCE_ID, SyncedSourceSnapshot } from '../catalog/catalog-sources';
import { RejectedComponent, SelectionResult } from './schema';

/** Motifs d'écart, en clair, pour le bilan par source. */
export const REJECTION_REASON_LABELS: Record<RejectedComponent['rejectionReason'], string> = {
  STACK_INCOMPATIBLE: 'pile technique différente',
  SURFACE_INCOMPATIBLE: 'surface Antigravity non prise en charge',
  SCORE_BELOW_PRESET_THRESHOLD: 'pertinence insuffisante pour le preset',
  DEDUPLICATED_FAMILY_OVERRIDDEN: 'fonction déjà couverte par un autre composant',
  SECURITY_OR_SAFETY_REJECTION: 'incompatible ou jugé dangereux',
  USER_EXCLUDED: 'exclu par vous',
  PLATFORM_SPECIFIC_OR_META: 'propre à Claude Code ou outillage interne',
  NOT_APPLICABLE_TO_PROJECT: 'sans rapport avec le projet',
  NO_FUNCTIONAL_SLOT: 'aucune fonction connue du moteur (choix manuel possible)',
  TIER_NOT_IN_PRESET: 'réservé à un preset plus complet',
  METHODOLOGY_DISABLED: 'méthodologie non activée',
};

export interface SourceSelectionSummary {
  sourceId: string;
  name: string;
  /**
   * OK : présente dans le catalogue en service ; FAILED : sa dernière synchronisation a échoué ;
   * MISSING : active mais absente du catalogue en service (catalogue à reconstruire).
   */
  status: 'OK' | 'FAILED' | 'MISSING';
  error?: string;
  inCatalog: number;
  selected: number;
  /** Motifs d'écart, du plus fréquent au moins fréquent, avec un exemple. */
  rejections: Array<{ reason: RejectedComponent['rejectionReason']; label: string; count: number; example: string }>;
}

/**
 * Bilan de la sélection source par source : combien de composants chaque source proposait, combien sont
 * retenus, et pourquoi les autres sont écartés. Signale aussi les sources actives absentes du catalogue.
 */
export function summarizeSelectionBySource(params: {
  selection: Pick<SelectionResult, 'selectedComponents' | 'rejectedComponents'>;
  catalog: ReadonlyArray<{ parsedMeta?: { sourceId?: string } }>;
  /** Sources réellement synchronisées dans le catalogue en service. */
  syncedSources: readonly SyncedSourceSnapshot[];
  /** Sources actives du registre (ce que le catalogue devrait contenir). */
  activeSources: ReadonlyArray<{ id: string; name: string }>;
}): SourceSelectionSummary[] {
  const { selection, catalog, syncedSources, activeSources } = params;
  const count = (id: string) => catalog.filter((c) => c.parsedMeta?.sourceId === id).length;

  const ids = new Set<string>([...activeSources.map((s) => s.id), ...syncedSources.map((s) => s.id)]);
  const summaries: SourceSelectionSummary[] = [];
  for (const id of ids) {
    if (id === CURATED_SOURCE_ID) continue;
    const synced = syncedSources.find((s) => s.id === id);
    const name = synced?.name ?? activeSources.find((s) => s.id === id)?.name ?? id;
    const inCatalog = count(id);
    const byReason = new Map<RejectedComponent['rejectionReason'], string[]>();
    for (const r of selection.rejectedComponents) {
      if (r.sourceId !== id) continue;
      byReason.set(r.rejectionReason, [...(byReason.get(r.rejectionReason) ?? []), r.slug]);
    }
    summaries.push({
      sourceId: id,
      name,
      status: synced?.error ? 'FAILED' : inCatalog === 0 ? 'MISSING' : 'OK',
      ...(synced?.error ? { error: synced.error } : {}),
      inCatalog,
      selected: selection.selectedComponents.filter((c) => c.sourceId === id).length,
      rejections: [...byReason.entries()]
        .map(([reason, slugs]) => ({ reason, label: REJECTION_REASON_LABELS[reason], count: slugs.length, example: slugs[0]! }))
        .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
    });
  }
  return summaries.sort((a, b) => b.inCatalog - a.inCatalog || a.name.localeCompare(b.name));
}
