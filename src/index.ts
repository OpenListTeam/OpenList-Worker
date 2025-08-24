import {Context, Hono} from 'hono'
import * as fsf from './manage/FileManage'

const app = new Hono()

// 列出文件 ============================================================
app.get('/@file/list/*', async (c: Context) => {
    let now_path: string = c.req.path.substring('/@file/list'.length);
    let now_conn = await fsf.loadDriver(now_path)
    return c.text('Hello Hono!')
})

export default app
