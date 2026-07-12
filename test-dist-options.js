import app from "./dist/api/[...route].js"
async function run() {
    const req = new Request("https://openlistnext.edgeone.dev/api/auth/login/hash", {
        method: "OPTIONS",
        headers: { "Origin": "https://openlistnext-dp0ix28515bq.edgeone.dev", "Access-Control-Request-Method": "POST" }
    })
    const res = await app.fetch(req)
    console.log("status:", res.status)
    res.headers.forEach((v, k) => console.log(`${k}: ${v}`))
}
run()
