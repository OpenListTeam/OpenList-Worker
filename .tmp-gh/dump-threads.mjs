import { writeFileSync } from "node:fs"

const token = process.env.GH_TOKEN
const query = `query($owner:String!,$name:String!,$number:Int!){
  repository(owner:$owner,name:$name){
    pullRequest(number:$number){
      reviewThreads(first:100){
        nodes{
          id
          isResolved
          isCollapsed
          path
          line
          comments(first:40){
            nodes{ databaseId author{login} body createdAt }
          }
        }
      }
    }
  }
}`

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "openlist-pr-triage",
  },
  body: JSON.stringify({
    query,
    variables: { owner: "OpenListTeam", name: "OpenList-Worker", number: 148 },
  }),
})
const json = await res.json()
if (json.errors) {
  console.error(JSON.stringify(json.errors))
  process.exit(1)
}
const nodes = json.data.repository.pullRequest.reviewThreads.nodes
const lines = []
nodes.forEach((t, i) => {
  const cs = t.comments.nodes
  const first = cs[0] || {}
  lines.push(
    `[${i + 1}] ${t.isResolved ? "RESOLVED" : "OPEN"} collapsed=${t.isCollapsed} id=${t.id}`,
  )
  lines.push(`  file: ${t.path}:${t.line ?? "?"} author=${first.author?.login}`)
  lines.push(`  body: ${String(first.body || "").replace(/\s+/g, " ").slice(0, 700)}`)
  cs.slice(1).forEach((c) => {
    lines.push(
      `  reply(${c.author?.login}): ${String(c.body || "").replace(/\s+/g, " ").slice(0, 500)}`,
    )
  })
})
writeFileSync(".tmp-gh/threads.txt", lines.join("\n"), "utf8")
console.log(`threads=${nodes.length}`)
