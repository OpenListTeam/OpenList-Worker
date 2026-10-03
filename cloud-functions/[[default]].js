// Keep this entry in Git so EdgeOne can discover Node functions before running
// the project build. The backend bundle is generated outside cloud-functions/
// to avoid registering it as another route.
import { onRequest as handleRequest } from "../dist-server/edgeone-entry.js"

export function onRequest(context) {
  return handleRequest(context)
}

export default onRequest
