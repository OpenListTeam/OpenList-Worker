import {Context} from "hono";

export async function getConfig(c: Context, name: string): Promise<Record<string, any>> {
    // 1. 先按 method 分流
    if (c.req.method === 'POST') {
        try {
            const body: any = await c.req.json()
            if (!body) return {}
            return body
        } catch {
            return {}
        }
    }
    // 2. 非 POST 一律走 query
    return JSON.parse(c.req.query(name) || '{}')
}