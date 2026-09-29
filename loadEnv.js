import fs from "fs";
import path from "path";
try {
  const envPath = path.resolve(process.cwd(), ".env");
  const envFile = fs.readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      if (!process.env[match[1]]) {
         process.env[match[1]] = match[2];
      }
    }
  });
} catch (e) {
}
