const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '..', 'public', 'img-bank');
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);

function isImage(fileName) {
  return allowed.has(path.extname(fileName).toLowerCase());
}

function main() {
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Directory not found: ${targetDir}`);
  }

  const entries = fs
    .readdirSync(targetDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isImage(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));

  if (!entries.length) {
    console.log('No image files found.');
    return;
  }

  const tempRenames = [];
  for (let i = 0; i < entries.length; i += 1) {
    const original = entries[i];
    const temp = `__tmp_rename_${String(i + 1).padStart(3, '0')}__${path.extname(original).toLowerCase()}`;
    fs.renameSync(path.join(targetDir, original), path.join(targetDir, temp));
    tempRenames.push(temp);
  }

  const finalNames = [];
  for (let i = 0; i < tempRenames.length; i += 1) {
    const temp = tempRenames[i];
    const ext = path.extname(temp).toLowerCase();
    const finalName = `IMG-${i + 1}${ext}`;
    fs.renameSync(path.join(targetDir, temp), path.join(targetDir, finalName));
    finalNames.push(finalName);
  }

  console.log(`Renamed ${finalNames.length} files in ${targetDir}`);
  finalNames.forEach((name) => console.log(name));
}

main();
