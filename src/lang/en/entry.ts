const jsons = import.meta.glob("./*.json", { eager: true, import: "default" })
const langs: any = {}
for (const path in jsons) {
  const normalizedPath = path.replace(/\\/g, "/")
  const filename = normalizedPath.split("/").pop() || ""
  const name = filename.split(".")[0]
  langs[name] = jsons[path]
}
export default langs
