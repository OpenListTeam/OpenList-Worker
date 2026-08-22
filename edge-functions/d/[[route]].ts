import backendApp from "../../src/backend/index"

export async function onRequest(context: any) {
  return backendApp.fetch(context.request, context.env, context)
}

export default {
  fetch: (request: Request, env: any, ctx: any) =>
    backendApp.fetch(request, env, ctx),
}
