import fs from "fs";
import path from "path";
try {
  const envPath = path.resolve(process.cwd(), ".env");
  const envFile = fs.readFileSync(envPath, "utf-8");
  envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      // 剥离 CRLF 残留与成对引号：JWT_SECRET="abc" 应得到 abc 而不是 "abc"（含引号 8 字符）
      let value = (match[2] ?? "").trim();
      if (
        (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[match[1]]) {
        process.env[match[1]] = value;
      }
    }
  });
} catch (e) {
}
