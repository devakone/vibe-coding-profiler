
import fs from "fs";
import path from "path";
import sharp from "sharp";

const DIRECTORIES = [
    "public/aura-backgrounds",
    "public/aura-icons"
];

async function convert() {
    const rootDir = path.resolve(__dirname, "../"); // apps/web

    for (const dirRelative of DIRECTORIES) {
        const dirPath = path.join(rootDir, dirRelative);

        if (!fs.existsSync(dirPath)) {
            console.warn(`Directory not found: ${dirPath}`);
            continue;
        }

        console.log(`Processing directory: ${dirRelative}`);
        const files = fs.readdirSync(dirPath).filter(f => f.toLowerCase().endsWith(".webp"));

        for (const file of files) {
            const inputPath = path.join(dirPath, file);
            const outputPath = path.join(dirPath, file.replace(/\.webp$/i, ".png"));

            if (fs.existsSync(outputPath)) {
                console.log(`  Skipping ${file} (PNG already exists)`);
                continue;
            }

            console.log(`  Converting ${file} -> PNG...`);
            try {
                await sharp(inputPath).png().toFile(outputPath);
            } catch (e) {
                console.error(`  Failed to convert ${file}:`, e);
            }
        }
    }
    console.log("Conversion complete!");
}

convert();
