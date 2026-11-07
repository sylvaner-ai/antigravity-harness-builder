import { gzipSync, strToU8 } from 'fflate';

/**
 * Utilitaire de test construisant une archive `.tar.gz` POSIX USTAR valide en mémoire.
 */
export function buildSyntheticTarGz(files: Array<{ path: string; content: string }>): Uint8Array {
  const blocks: Uint8Array[] = [];

  for (const file of files) {
    const contentBytes = strToU8(file.content);
    const header = new Uint8Array(512);

    // Name (0..100)
    const nameBytes = strToU8(file.path.slice(0, 99));
    header.set(nameBytes, 0);

    // Mode (100..108)
    header.set(strToU8('0000644\0'), 100);
    // Size en octal sur 11 chiffres + NUL (124..136)
    const sizeOctal = contentBytes.byteLength.toString(8).padStart(11, '0') + '\0';
    header.set(strToU8(sizeOctal), 124);
    // Mtime (136..148)
    header.set(strToU8('14725276000\0'), 136);
    // Typeflag '0' (fichier régulier) à l'offset 156
    header[156] = '0'.charCodeAt(0);
    // Magic USTAR (257..263)
    header.set(strToU8('ustar\0'), 257);
    header.set(strToU8('00'), 263);

    // Calcul du checksum (148..156) : remplissage initial avec des espaces
    for (let i = 148; i < 156; i += 1) {
      header[i] = 32;
    }
    let checksum = 0;
    for (let i = 0; i < 512; i += 1) {
      checksum += header[i] ?? 0;
    }
    const chkOctal = checksum.toString(8).padStart(6, '0') + '\0 ';
    header.set(strToU8(chkOctal), 148);

    blocks.push(header);
    blocks.push(contentBytes);

    const remainder = contentBytes.byteLength % 512;
    if (remainder !== 0) {
      blocks.push(new Uint8Array(512 - remainder));
    }
  }

  // Deux blocs de 512 octets à zéro pour marquer la fin de l'archive TAR
  blocks.push(new Uint8Array(1024));

  const totalLength = blocks.reduce((acc, b) => acc + b.byteLength, 0);
  const tarBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of blocks) {
    tarBuffer.set(b, offset);
    offset += b.byteLength;
  }

  return gzipSync(tarBuffer);
}
