import { handle } from "hono/aws-lambda"
import app from "./src/backend/index"

export const handler = handle(app)
