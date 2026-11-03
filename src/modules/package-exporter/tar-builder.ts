import { gzipSync, strToU8 } from 'fflate';

export interface FileToTar {
  relativePath: string;
  content: string;
}

/**
 * Construit une archive tarball POSIX USTAR gzippée (.tar.gz) en mémoire pure (sans accès disque).
 * Retourne la chaîne encodée en Base64.
 */
export function buildTarGzBase64(files: FileToTar[]): string {
  const blocks: Uint8Array[] = [];

  for (const file of files) {
    const data = strToU8(file.content);
    const header = Buffer.alloc(512);

    // 1. Nom du fichier (0..99)
    const safePath = file.relativePath.replace(/^\.\//, '');
    header.write(safePath, 0, 100, 'utf-8');

    // 2. Permissions (mode octal 0644) (100..107)
    header.write('0000644\0', 100, 8, 'ascii');

    // 3. UID / GID (108..123)
    header.write('0000000\0', 108, 8, 'ascii');
    header.write('0000000\0', 116, 8, 'ascii');

    // 4. Taille du fichier en octal (124..135)
    const sizeOctal = data.byteLength.toString(8).padStart(11, '0') + '\0';
    header.write(sizeOctal, 124, 12, 'ascii');

    // 5. Modification time fixe pour déterminisme (136..147)
    header.write('14000000000\0', 136, 12, 'ascii');

    // 6. Typeflag '0' (fichier régulier) (156)
    header[156] = 48; // '0'

    // 7. Magic USTAR + Version (257..264)
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');

    // 8. Calcul du Checksum TAR (148..155)
    header.fill(32, 148, 156); // 8 espaces pour le calcul
    let chksum = 0;
    for (let i = 0; i < 512; i += 1) {
      chksum += header[i] ?? 0;
    }
    const chksumOctal = chksum.toString(8).padStart(6, '0') + '\0 ';
    header.write(chksumOctal, 148, 8, 'ascii');

    blocks.push(header);
    blocks.push(data);

    // Alignement sur 512 octets
    const remainder = data.byteLength % 512;
    if (remainder > 0) {
      blocks.push(Buffer.alloc(512 - remainder));
    }
  }

  // Deux blocs de fin de 512 octets à zéro
  blocks.push(Buffer.alloc(1024));

  const totalTarBuffer = Buffer.concat(blocks);
  const gzippedBytes = gzipSync(totalTarBuffer);

  return Buffer.from(gzippedBytes).toString('base64');
}
