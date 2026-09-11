// Match Wrangler's automatic namespace names, including its binding-name normalization.
// Explicit IDs and existing Worker bindings take precedence over a namespace title.
export async function resolveKVBindings(
  accountId,
  workerName,
  bindings,
  headers,
  uploadOnly,
) {
  if (bindings.every((binding) => binding.id)) return bindings

  const accountPath = `/accounts/${encodeURIComponent(accountId)}`
  const namespacePath = `${accountPath}/storage/kv/namespaces`

  async function request(path, options = {}) {
    const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      ...options,
      headers: { ...headers, "Content-Type": "application/json" },
    })
    const data = await response.json()
    if (!response.ok || !data.success) {
      const error = new Error(
        `Cloudflare KV preparation failed (HTTP ${response.status}): ` +
          data.errors
            .map((entry) => `${entry.message} [code: ${entry.code}]`)
            .join("; "),
      )
      error.codes = data.errors.map((entry) => entry.code)
      throw error
    }
    return data.result
  }

  let workerBindings
  try {
    const settings = await request(
      `${accountPath}/workers/scripts/${encodeURIComponent(workerName)}/settings`,
    )
    workerBindings = settings.bindings
  } catch (error) {
    if (!error.codes?.includes(10007)) throw error
    if (uploadOnly) {
      throw new Error(
        "Deploy the production Worker once before uploading preview versions.",
      )
    }
    workerBindings = []
  }

  async function findNamespace(title) {
    for (let page = 1; ; page++) {
      const namespaces = await request(
        `${namespacePath}?per_page=100&page=${page}`,
      )
      const namespace = namespaces.find((entry) => entry.title === title)
      if (namespace) return namespace
      if (namespaces.length < 100) return undefined
    }
  }

  const resolved = []
  for (const binding of bindings) {
    if (binding.id) {
      resolved.push(binding)
      continue
    }

    const inherited = workerBindings.find(
      (entry) => entry.type === "kv_namespace" && entry.name === binding.binding,
    )
    if (inherited) {
      resolved.push({ ...binding, id: inherited.namespace_id })
      continue
    }

    const title = `${workerName}-${binding.binding.toLowerCase().replaceAll("_", "-")}`
    let namespace = await findNamespace(title)
    if (!namespace) {
      try {
        namespace = await request(namespacePath, {
          method: "POST",
          body: JSON.stringify({ title }),
        })
      } catch (error) {
        // Another build may have created the namespace after our lookup.
        if (!error.codes?.includes(10014)) throw error
        namespace = await findNamespace(title)
        if (!namespace) throw error
      }
    }
    resolved.push({ ...binding, id: namespace.id })
  }
  return resolved
}
