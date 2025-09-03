import {Context, Hono} from 'hono'
import * as fsf from './manage/FileManage'

// 绑定数据 ###############################################################################
export type Bindings = {
    KV_DATA: KVNamespace, D1_DATA: D1Database, ENABLE_D1: boolean
}
export const app = new Hono<{ Bindings: Bindings }>()


// 列出文件 ============================================================
app.get('/@file/list/*', async (c: Context) => {
    let now_path: string = c.req.path.substring('/@file/list'.length);
    let now_conn = await fsf.loadDriver(c, now_path)
    return c.text('Hello Hono!')
})

export default app
