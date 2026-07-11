import { sign } from "hono/jwt"

async function run() {
  const token = await sign({ id: 1, role: 2, exp: Math.floor(Date.now() / 1000) + 3600 }, "super-secret-openlist-key", "HS256")
  const res = await fetch("http://localhost:3000/api/fs/list", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ path: "/" })
  })
  const data = await res.json()
  console.log("Root content:", JSON.stringify(data, null, 2))
}
run()
