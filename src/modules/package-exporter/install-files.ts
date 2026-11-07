/**
 * Fichiers réellement installés dans le projet par les prompts de déploiement et de mise à niveau.
 *
 * L'archive ZIP garde la documentation de traçabilité complète. Dans le projet, seul ce qui sert à l'agent
 * ou à la prochaine mise à niveau est installé, pour que le prompt reste collable :
 * - `docs/ECC_SOURCES.md` perd la liste des candidats écartés, mais garde la traçabilité des composants
 *   retenus et les licences (attribution MIT obligatoire) ;
 * - `docs/HARNESS_MANIFEST.json` perd le détail des composants (scores, justifications), mais garde
 *   l'inventaire des fichiers et leurs empreintes, base du plan de la prochaine mise à niveau.
 */

import crypto from 'node:crypto';

const ECC_SOURCES = 'docs/ECC_SOURCES.md';
const MANIFEST = 'docs/HARNESS_MANIFEST.json';
const REJECTED_SECTION = /\n## 2\. Principaux Candidats Écartés[\s\S]*?(?=\n## 3\. )/;

function compactEccSources(content: string): string {
  return content.replace(
    REJECTED_SECTION,
    "\n## 2. Principaux Candidats Écartés\n\nLa liste des candidats écartés figure dans l'archive ZIP et dans Antigravity Harness Builder.\n"
  );
}

/** `installedHashes` : empreintes des fichiers transformés pour l'installation, reportées dans l'inventaire. */
function compactManifest(content: string, installedHashes: Map<string, string>): string {
  try {
    const manifest = JSON.parse(content) as Record<string, unknown>;
    const components = Array.isArray(manifest.components) ? manifest.components : [];
    const inventory = Array.isArray(manifest.filesInventory) ? manifest.filesInventory : [];
    const compact = {
      ...manifest,
      filesInventory: inventory.map((entry) => {
        const e = entry as Record<string, unknown>;
        const installed = typeof e.relativePath === 'string' ? installedHashes.get(e.relativePath) : undefined;
        return installed ? { ...e, sha256: installed } : e;
      }),
      components: components.map((c) => {
        const item = c as Record<string, unknown>;
        return { id: item.id, kind: item.kind, destinationPath: item.destinationPath, originStatus: item.originStatus };
      }),
    };
    return JSON.stringify(compact, null, 2);
  } catch {
    return content; // manifeste illisible : installé tel quel plutôt que perdu
  }
}

export function filesForProjectInstall<T extends { relativePath: string; content: string }>(files: readonly T[]): T[] {
  const installedHashes = new Map<string, string>();
  const transformed = files.map((f) => {
    if (f.relativePath !== ECC_SOURCES) return f;
    const content = compactEccSources(f.content);
    installedHashes.set(f.relativePath, crypto.createHash('sha256').update(content).digest('hex'));
    return { ...f, content };
  });
  return transformed.map((f) =>
    f.relativePath === MANIFEST ? { ...f, content: compactManifest(f.content, installedHashes) } : f
  );
}
