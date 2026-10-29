import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import DOMPurify from 'isomorphic-dompurify';
import yaml from 'js-yaml';

export interface ExtractedDocumentResult {
  text: string;
  metadata: {
    method: string;
    pagesCount?: number;
    warnings?: string[];
    tokensCountEstimate: number;
  };
}

/**
 * Nettoyage de sécurité Unicode & anti-injection (Risque R-02).
 * Supprime les caractères invisibles (zero-width), contrôles bidi trompeurs, etc.
 */
export function sanitizeTextForPromptSafety(rawText: string): { sanitized: string; warnings: string[] } {
  const warnings: string[] = [];

  // Détection des caractères bidi & zero-width
  const suspiciousCharsRegex = /[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g;
  if (suspiciousCharsRegex.test(rawText)) {
    warnings.push('Des caractères Unicode invisibles ou de contrôle bidirectionnel ont été purgés.');
  }

  let cleaned = rawText
    .replace(suspiciousCharsRegex, '')
    // Remplacement des séquences null bytes
    .replace(/\0/g, '')
    // Normalisation Unicode
    .normalize('NFC');

  // Détection et neutralisation des signatures d'injection de prompt malveillantes (R-02)
  const injectionPatterns = [
    /(?:system\s+override|ignore\s+(?:all\s+)?(?:previous\s+)?(?:security\s+)?(?:system\s+)?instructions|disregard\s+(?:earlier|previous)\s+prompts)/gi,
    /(?:disable\s+(?:all\s+)?(?:code\s+)?reviews|grant\s+full\s+(?:bash|root))/gi,
  ];
  for (const pattern of injectionPatterns) {
    if (pattern.test(cleaned)) {
      warnings.push("Tentative d'injection de prompt ou d'altération système neutralisée.");
      cleaned = cleaned.replace(pattern, '[BLOCKED_INJECTION_ATTEMPT]');
    }
  }

  return { sanitized: cleaned, warnings };
}

/**
 * Détecte le type réel du fichier (magic bytes / inspection sécurisée)
 */
export function validateAndDetectMimeType(
  fileName: string,
  data: Uint8Array
): { mimeType: string; isSupported: boolean; reason?: string } {
  const ext = fileName.split('.').pop()?.toLowerCase();

  // Contrôles par signatures magiques
  if (data.length >= 4 && data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
    // %PDF
    return { mimeType: 'application/pdf', isSupported: true };
  }

  // ZIP / DOCX (PK\x03\x04)
  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
    if (ext === 'docx') {
      return { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', isSupported: true };
    }
  }

  // PNG (\x89PNG\r\n\x1a\n)
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return { mimeType: 'image/png', isSupported: true };
  }

  // JPEG (\xff\xd8\xff)
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { mimeType: 'image/jpeg', isSupported: true };
  }

  // Fichiers texte déclaratifs (MD, TXT, JSON, YAML, CSS/SCSS, SVG)
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const textSample = decoder.decode(data.subarray(0, Math.min(data.length, 4096)));

  if (ext === 'md' || ext === 'markdown') {
    return { mimeType: 'text/markdown', isSupported: true };
  }
  if (ext === 'txt') {
    return { mimeType: 'text/plain', isSupported: true };
  }
  if (ext === 'json') {
    return { mimeType: 'application/json', isSupported: true };
  }
  if (ext === 'yaml' || ext === 'yml') {
    return { mimeType: 'application/x-yaml', isSupported: true };
  }
  if (ext === 'css' || ext === 'scss') {
    return { mimeType: 'text/css', isSupported: true };
  }

  if (ext === 'svg' || textSample.includes('<svg')) {
    return { mimeType: 'image/svg+xml', isSupported: true };
  }

  return {
    mimeType: 'application/octet-stream',
    isSupported: false,
    reason: `Format de fichier non pris en charge ou signature inconnue (.${ext}).`,
  };
}

/**
 * Extracteur déclaratif sécurisé sans macro ni exécution de script (§7 FR-02).
 */
export async function extractDocumentText(
  fileName: string,
  mimeType: string,
  data: Uint8Array
): Promise<ExtractedDocumentResult> {
  const warnings: string[] = [];

  if (data.byteLength === 0) {
    throw new Error(`Le fichier '${fileName}' est vide (0 octet).`);
  }

  let rawExtractedText = '';
  let method = 'raw-text';
  let pagesCount: number | undefined;

  switch (mimeType) {
    case 'application/pdf': {
      method = 'pdf-parse';
      const buffer = Buffer.from(data);
      const parsed = await pdfParse(buffer);
      rawExtractedText = parsed.text;
      pagesCount = parsed.numpages;
      if (!rawExtractedText || rawExtractedText.trim().length === 0) {
        throw new Error(`Le document PDF '${fileName}' ne contient aucun texte extractible.`);
      }
      break;
    }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      method = 'mammoth-docx';
      const buffer = Buffer.from(data);
      const parsed = await mammoth.extractRawText({ buffer });
      rawExtractedText = parsed.value;
      if (parsed.messages && parsed.messages.length > 0) {
        warnings.push(...parsed.messages.map((m) => m.message));
      }
      if (!rawExtractedText || rawExtractedText.trim().length === 0) {
        throw new Error(`Le document DOCX '${fileName}' ne contient aucun texte extractible.`);
      }
      break;
    }

    case 'application/json': {
      method = 'json-parse';
      const str = new TextDecoder('utf-8').decode(data);
      const obj = JSON.parse(str);
      rawExtractedText = JSON.stringify(obj, null, 2);
      break;
    }

    case 'application/x-yaml': {
      method = 'yaml-parse';
      const str = new TextDecoder('utf-8').decode(data);
      const obj = yaml.load(str, { schema: yaml.CORE_SCHEMA });
      rawExtractedText = yaml.dump(obj, { lineWidth: -1 });
      break;
    }

    case 'image/svg+xml': {
      method = 'svg-sanitized-xml';
      const str = new TextDecoder('utf-8').decode(data);
      // DOMPurify désactive toute balise script / event handler
      const cleanSvg = DOMPurify.sanitize(str, { USE_PROFILES: { svg: true, svgFilters: true } });
      if (cleanSvg.includes('<script') || /on\w+=/i.test(cleanSvg)) {
        throw new Error(`SVG non sécurisé rejeté pour '${fileName}'.`);
      }
      rawExtractedText = cleanSvg;
      break;
    }

    case 'text/markdown':
    case 'text/plain':
    case 'text/css': {
      method = 'utf8-text';
      rawExtractedText = new TextDecoder('utf-8').decode(data);
      break;
    }

    case 'image/png':
    case 'image/jpeg': {
      method = 'visual-image-placeholder';
      rawExtractedText = `[Ressource image: ${fileName} (${mimeType}, ${data.byteLength} octets)]`;
      warnings.push(`Image '${fileName}' enregistrée pour analyse visuelle par le fournisseur LLM.`);
      break;
    }

    default:
      throw new Error(`Mime-type '${mimeType}' non supporté pour l'extraction.`);
  }

  const { sanitized, warnings: sanitizeWarnings } = sanitizeTextForPromptSafety(rawExtractedText);
  warnings.push(...sanitizeWarnings);

  const tokensEstimate = Math.ceil(sanitized.length / 4);

  return {
    text: sanitized,
    metadata: {
      method,
      pagesCount,
      warnings: warnings.length > 0 ? warnings : undefined,
      tokensCountEstimate: tokensEstimate,
    },
  };
}
