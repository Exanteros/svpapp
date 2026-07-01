import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const sourceCandidates = [
  path.join(projectRoot, 'app', 'jens.png'),
  path.join(projectRoot, 'public', 'jens.png'),
];
const outputDir = path.join(projectRoot, 'public', 'hero');
const widths = [960, 1440, 1920, 2560];

async function findSource() {
  for (const candidate of sourceCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function writeVariant(source, width, format) {
  const extension = format === 'avif' ? 'avif' : 'webp';
  const target = path.join(outputDir, `jens-${width}.${extension}`);
  const image = sharp(source)
    .rotate()
    .resize({
      width,
      withoutEnlargement: true,
    });

  if (format === 'avif') {
    await image
      .avif({
        quality: 62,
        effort: 8,
        chromaSubsampling: '4:4:4',
      })
      .toFile(target);
    return target;
  }

  await image
    .webp({
      quality: 86,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(target);
  return target;
}

async function isFresh(source, targets) {
  try {
    const sourceStat = await fs.stat(source);
    const targetStats = await Promise.all(targets.map((target) => fs.stat(target)));
    return targetStats.every((targetStat) => targetStat.mtimeMs >= sourceStat.mtimeMs);
  } catch {
    return false;
  }
}

async function fileSize(filePath) {
  const stat = await fs.stat(filePath);
  return stat.size;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const source = await findSource();

if (!source) {
  console.warn('⚠️ Kein jens.png gefunden. Hero-Optimierung übersprungen.');
  process.exit(0);
}

await fs.mkdir(outputDir, { recursive: true });

const sourceSize = await fileSize(source);
const writtenFiles = [];
const expectedFiles = widths.flatMap((width) => [
  path.join(outputDir, `jens-${width}.avif`),
  path.join(outputDir, `jens-${width}.webp`),
]);

if (await isFresh(source, expectedFiles)) {
  console.log(`✅ Hero-Bild bereits optimiert: ${path.relative(projectRoot, source)} (${formatBytes(sourceSize)})`);
  for (const file of expectedFiles) {
    const size = await fileSize(file);
    console.log(`   ${path.relative(projectRoot, file)} ${formatBytes(size)}`);
  }
  process.exit(0);
}

for (const width of widths) {
  writtenFiles.push(await writeVariant(source, width, 'avif'));
  writtenFiles.push(await writeVariant(source, width, 'webp'));
}

console.log(`✅ Hero-Bild optimiert: ${path.relative(projectRoot, source)} (${formatBytes(sourceSize)})`);

for (const file of writtenFiles) {
  const size = await fileSize(file);
  console.log(`   ${path.relative(projectRoot, file)} ${formatBytes(size)}`);
}
