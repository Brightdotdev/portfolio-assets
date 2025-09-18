// scripts/convertAssets.ts
// Run with: npx ts-node scripts/convertAssets.ts
// Requires: npm install sharp fluent-ffmpeg @types/node @types/fluent-ffmpeg

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");


// Define constants for directories
const RAW_IMAGES_DIR = path.join(process.cwd(), "raw-assets/images");
const RAW_VIDEOS_DIR = path.join(process.cwd(), "raw-assets/videos");
const PUBLIC_IMAGES_DIR = path.join(process.cwd(), "public/images");
const PUBLIC_VIDEOS_DIR = path.join(process.cwd(), "public/videos");

// Ensure output dirs exist
[PUBLIC_IMAGES_DIR, PUBLIC_VIDEOS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper: Recursively collect all files
function getAllFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

// -------- IMAGE CONVERSION --------
async function convertImages(): Promise<void> {
  if (!fs.existsSync(RAW_IMAGES_DIR)) return;

  const files = getAllFiles(RAW_IMAGES_DIR);

  for (const inputPath of files) {
    const relativePath = path.relative(RAW_IMAGES_DIR, inputPath);
    const baseName = path.parse(relativePath).name;
    const outDir = path.join(PUBLIC_IMAGES_DIR, path.dirname(relativePath));

    // Ensure subdirectory exists
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    console.log(`Processing image: ${relativePath}`);

    // Convert to WebP
    await sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(path.join(outDir, `${baseName}.webp`));

    // Convert to AVIF
    await sharp(inputPath)
      .avif({ quality: 60 })
      .toFile(path.join(outDir, `${baseName}.avif`));

    // Convert to JPEG fallback
    await sharp(inputPath)
      .jpeg({ quality: 85 })
      .toFile(path.join(outDir, `${baseName}.jpg`));
  }
}

// -------- VIDEO CONVERSION --------
async function convertVideos(): Promise<void> {
  if (!fs.existsSync(RAW_VIDEOS_DIR)) return;

  const files = getAllFiles(RAW_VIDEOS_DIR);

  for (const inputPath of files) {
    const relativePath = path.relative(RAW_VIDEOS_DIR, inputPath);
    const baseName = path.parse(relativePath).name;
    const outDir = path.join(PUBLIC_VIDEOS_DIR, path.dirname(relativePath));

    // Ensure subdirectory exists
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    console.log(`Processing video: ${relativePath}`);

    // Convert to WebM
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .output(path.join(outDir, `${baseName}.webm`))
        .videoCodec("libvpx-vp9")
        .audioCodec("libopus")
        .outputOptions(["-crf 30", "-b:v 0"])
        .on("end", () => resolve())
        .on("error", (err : Error ) => reject(err))
        .run();
    });

    // Convert to MP4
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .output(path.join(outDir, `${baseName}.mp4`))
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions(["-crf 28", "-preset veryfast"])
        .on("end", () => resolve())
        .on("error", (err : Error ) => reject(err))
        .run();
    });
  }
}

// -------- RUN SCRIPT --------
(async () => {
  try {
    await convertImages();
    // await convertVideos();
    console.log("✅ All assets converted successfully!");
  } catch (err) {
    console.error("❌ Error converting assets:", err);
  }
})();
