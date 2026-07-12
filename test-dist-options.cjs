// Manually mock 'module' since Node ESM loader refuses require of .js in "type": "module" package
// Actually, just require works if we override require.extensions? No.
// Let's just rename it temporarily to test!
const fs = require('fs');
fs.copyFileSync('dist/api/[...route].js', 'dist/api/[...route].cjs');
const app = require("./dist/api/[...route].cjs");

async function run() {
    const req = new Request("https://openlistnext.edgeone.dev/api/auth/login/hash", {
        method: "OPTIONS",
        headers: { "Origin": "https://openlistnext-dp0ix28515bq.edgeone.dev", "Access-Control-Request-Method": "POST" }
    })
    const res = await app.default.fetch(req)
    console.log("status:", res.status)
    res.headers.forEach((v, k) => console.log(`${k}: ${v}`))
}
run()
