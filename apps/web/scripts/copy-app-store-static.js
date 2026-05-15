import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { sync as globSync } from "glob";

const copyAppStoreStatic = () => {
  const staticFiles = globSync("../../packages/app-store/**/static/**/*", { nodir: true });

  const SVG_HASHES = {};

  staticFiles.forEach((file) => {
    const normalizedFile = file.replace(/\\/g, "/");
    const appNameMatch = normalizedFile.match(/app-store\/(.*?)\/static/);
    if (!appNameMatch) return;

    const appDirName = appNameMatch[1];
    const fileName = path.basename(file);
    const destDir = path.join(process.cwd(), "public", "app-store", appDirName);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, fileName);
    fs.copyFileSync(file, destPath);

    if (fileName.includes("icon") && fileName.endsWith(".svg")) {
      const content = fs.readFileSync(file, "utf8");
      const hash = crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
      SVG_HASHES[appDirName] = hash;
    }

    console.log(`Copied ${file} to ${destPath}`);
  });

  const hashFilePath = path.join(process.cwd(), "public", "app-store", "svg-hashes.json");
  fs.writeFileSync(hashFilePath, JSON.stringify(SVG_HASHES, null, 2));
};

copyAppStoreStatic();
