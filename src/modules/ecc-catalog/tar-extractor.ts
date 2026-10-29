import { gunzipSync, strFromU8 } from 'fflate';

export interface TarFileEntry {
  /** Chemin relatif nettoyé (sans le dossier racine du tarball GitHub `affaan-m-ECC-<sha>/`) */
  relativePath: string;
  content: string;
  sizeBytes: number;
}

/**
 * Extrait en mémoire et en lecture 100 % passive (sans écrire sur le disque ni exécuter aucun fichier)
 * les fichiers textuels d'une archive `.tar.gz` (format POSIX USTAR / PAX de GitHub codeload).
 */
export function extractTarGzTextFilesInMemory(
  tarGzBytes: Uint8Array,
  options?: {
    maxFileSizeBytes?: number;
    maxTotalFiles?: number;
  }
): TarFileEntry[] {
  const maxFileSizeBytes = options?.maxFileSizeBytes ?? 512 * 1024; // 512 Ko max par fichier texte
  const maxTotalFiles = options?.maxTotalFiles ?? 3_000;

  let tarBytes: Uint8Array;
  try {
    tarBytes = gunzipSync(tarGzBytes);
  } catch (err) {
    throw new Error(
      `Échec de décompression GZIP du tarball ECC : ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (tarBytes.byteLength < 512) {
    throw new Error('Archive TAR ECC invalide ou tronquée (taille < 512 octets).');
  }

  const entries: TarFileEntry[] = [];
  let offset = 0;
  let paxPathOverride: string | null = null;

  while (offset + 512 <= tarBytes.byteLength) {
    const header = tarBytes.subarray(offset, offset + 512);

    // Fin de l'archive TAR : bloc de 512 octets entièrement à zéro
    let isZeroBlock = true;
    for (let i = 0; i < 512; i += 1) {
      if (header[i] !== 0) {
        isZeroBlock = false;
        break;
      }
    }
    if (isZeroBlock) {
      break;
    }

    const rawName = readNullTerminatedAscii(header, 0, 100);
    const sizeOctal = readNullTerminatedAscii(header, 124, 12).trim();
    const typeFlag = String.fromCharCode(header[156] ?? 0);
    const prefix = readNullTerminatedAscii(header, 345, 155);

    const fileSize = sizeOctal ? parseInt(sizeOctal, 8) : 0;
    if (Number.isNaN(fileSize) || fileSize < 0) {
      throw new Error(`Entête TAR corrompue (taille invalide '${sizeOctal}').`);
    }

    const dataStart = offset + 512;
    const dataEnd = dataStart + fileSize;
    if (dataEnd > tarBytes.byteLength) {
      throw new Error('Archive TAR ECC tronquée avant la fin du fichier annoncé.');
    }

    const paddedBlocksSize = Math.ceil(fileSize / 512) * 512;
    offset = dataStart + paddedBlocksSize;

    // Gestion des entêtes étendues PAX ('x' = pour l'entrée suivante, 'g' = global)
    if (typeFlag === 'x') {
      const paxPayload = strFromU8(tarBytes.subarray(dataStart, dataEnd));
      const parsedPaxPath = parsePaxPathRecord(paxPayload);
      if (parsedPaxPath) {
        paxPathOverride = parsedPaxPath;
      }
      continue;
    }

    // LongLink GNU tar ('L')
    if (typeFlag === 'L') {
      paxPathOverride = readNullTerminatedAscii(tarBytes.subarray(dataStart, dataEnd), 0, fileSize);
      continue;
    }

    const fullPath =
      paxPathOverride ?? (prefix ? `${prefix}/${rawName}` : rawName);
    paxPathOverride = null;

    // On ne retient que les fichiers normaux ('0' ou '\0'), jamais les liens symboliques ('2') ni les répertoires ('5')
    if (typeFlag !== '0' && typeFlag !== '\0') {
      continue;
    }

    // Suppression du préfixe racine du tarball GitHub (ex: "affaan-m-ECC-25278e7/")
    const slashIdx = fullPath.indexOf('/');
    const relativePath = slashIdx >= 0 ? fullPath.slice(slashIdx + 1) : fullPath;
    if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/')) {
      continue;
    }

    if (fileSize > maxFileSizeBytes) {
      continue;
    }

    // Ne lire que les fichiers utiles au catalogue ECC (rules/, agents/, skills/, commands/, manifests/, LICENSE, package.json)
    if (!isRelevantEccCatalogPath(relativePath)) {
      continue;
    }

    const fileBytes = tarBytes.subarray(dataStart, dataEnd);
    const content = strFromU8(fileBytes);

    entries.push({
      relativePath,
      content,
      sizeBytes: fileSize,
    });

    if (entries.length >= maxTotalFiles) {
      break;
    }
  }

  return entries;
}

function readNullTerminatedAscii(buf: Uint8Array, start: number, length: number): string {
  const end = Math.min(buf.byteLength, start + length);
  let sliceEnd = start;
  while (sliceEnd < end && buf[sliceEnd] !== 0) {
    sliceEnd += 1;
  }
  return strFromU8(buf.subarray(start, sliceEnd));
}

function parsePaxPathRecord(paxPayload: string): string | null {
  const lines = paxPayload.split('\n');
  for (const line of lines) {
    const match = line.match(/^\d+\s+path=(.+)$/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Filtre strict des chemins du dépôt ECC pertinents pour notre catalogue.
 * Exclut inconditionnellement `.agents/` (packaging Codex — §4.4 CDC), `hooks/`, `.claude-plugin/`, etc.
 */
export function isRelevantEccCatalogPath(relativePath: string): boolean {
  if (
    relativePath.startsWith('.agents/') ||
    relativePath.startsWith('hooks/') ||
    relativePath.startsWith('scripts/') ||
    relativePath.startsWith('.opencode/') ||
    relativePath.startsWith('.codex') ||
    relativePath.startsWith('.cursor/')
  ) {
    return false;
  }

  if (
    relativePath === 'LICENSE' ||
    relativePath === 'package.json' ||
    relativePath.startsWith('manifests/') ||
    relativePath.startsWith('rules/') ||
    relativePath.startsWith('agents/') ||
    relativePath.startsWith('skills/') ||
    relativePath.startsWith('commands/')
  ) {
    return /\.(md|json|yaml|yml|txt|css)$/i.test(relativePath) || relativePath === 'LICENSE';
  }

  return false;
}
