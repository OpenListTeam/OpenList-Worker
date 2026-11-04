const token = process.env.GH_TOKEN
if (!token) {
  console.error("missing GH_TOKEN")
  process.exit(1)
}

const query = `query($owner:String!,$name:String!,$number:Int!){
  repository(owner:$owner,name:$name){
    pullRequest(number:$number){
      title
      reviewThreads(first:100){
        nodes{
          id
          isResolved
          isCollapsed
          path
          line
          comments(first:30){
            nodes{
              databaseId
              author{login}
              body
              createdAt
              path
              line
              originalLine
            }
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
if (!res.ok || json.errors) {
  console.error(JSON.stringify(json, null, 2))
  process.exit(1)
}

const threads = json.data.repository.pullRequest.reviewThreads.nodes
const out = threads.map((t, i) => {
  const first = t.comments.nodes[0] || {}
  const bodies = t.comments.nodes.map((c) => ({
    author: c.author?.login || "ghost",
    id: c.databaseId,
    body: String(c.body || "").replace(/\r/g, "").slice(0, 400),
  }))
  return {
    index: i + 1,
    id: t.id,
    resolved: t.isResolved,
    collapsed: t.isCollapsed,
    path: t.path || first.path,
    line: t.line ?? first.line ?? first.originalLine ?? null,
    author: first.author?.login || bodies[0]?.author,
    replies: bodies.length,
    body: bodies[0]?.body || "",
  }
})

console.log(JSON.stringify(out, null, 2))
