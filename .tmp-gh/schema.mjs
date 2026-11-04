const token = process.env.GH_TOKEN
const query = `{ __type(name:"Mutation"){ fields{ name } } }`
const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "openlist-pr-triage",
  },
  body: JSON.stringify({ query }),
})
const json = await res.json()
if (json.errors) {
  console.error(JSON.stringify(json.errors))
  process.exit(1)
}
const names = json.data.__type.fields
  .map((f) => f.name)
  .filter((n) => /thread|collapse|minimi/i.test(n))
console.log(names.join("\n"))
