import {Context, Hono} from 'hono'
import {SavesManage} from "./saves/SavesManage";
import {DBSelect} from "./data/DataObject";
import {KVNamespace, D1Database} from "@cloudflare/workers-types";


// 绑定数据 ###############################################################################
export type Bindings = {
    KV_DATA: KVNamespace, D1_DATA: D1Database, ENABLE_D1: boolean, REMOTE_D1: string
}
export const app = new Hono<{ Bindings: Bindings }>()

interface PageAction {
    flag: boolean,
    text?: string,
    data?: Record<string, any>
}

// 文件管理 ###############################################################################
app.use('/@tasks/:action/:method/:source', async (c: Context) => {
    // let now_path: string = c.req.path.substring('/@tasks/list'.length);
    // let now_conn = await fsf.mountDriver(c, now_path)
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = c.req.param('source');
    const target: string | undefined = c.req.query('target');
    const driver: string | undefined = c.req.query('driver');
    const config: string | undefined = c.req.query('config');
    switch (action) {
        case "list": { // 列出文件 =====================================
            break;
        }
        case "link": { // 获取链接 =====================================
            break;
        }
        case "copy": { // 复制文件 =====================================
            break;
        }
        case "move": { // 移动文件 =====================================
            break;
        }
        case "create": { // 创建对象 ===================================
            break;
        }
        case "remove": { // 删除对象 ===================================
            break;
        }
        case "config": { // 配置对象 ===================================
            break;
        }
        case "shared": { // 共享对象 ===================================
            break;
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
    return c.json({flag: false, text: 'Invalid Action'}, 400)
})


// 挂载管理 #############################################################
app.use('/@path/:action/:method/:source', async (c: Context) => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = c.req.param('source');
    const config: string | undefined = c.req.query('config');
    switch (action) {
        case "select": { // 查找挂载 ===================================
            break;
        }
        case "create": { // 创建挂载 ===================================
            break;
        }
        case "remove": { // 删除挂载 ===================================
            break;
        }
        case "config": { // 配置挂载 ===================================
            break;
        }
        case "reload": { // 载入挂载 ===================================
            break;
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
    return c.json({flag: false, text: 'Invalid Action'}, 400)
})


// 用户管理 #############################################################
app.use('/@users/:action/:method/:source', async (c: Context) => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = c.req.param('source');
    const config: string | undefined = c.req.query('config');
    switch (action) {
        case "select": { // 查找用户 ===================================
            break;
        }
        case "create": { // 创建用户 ===================================
            break;
        }
        case "remove": { // 删除用户 ===================================
            break;
        }
        case "config": { // 配置用户 ===================================
            break;
        }
        case "login": { // 登录用户 ====================================
            break;
        }
        case "logout": {// 登出用户 ====================================
            break;
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
    return c.json({flag: false, text: 'Invalid Action'}, 400)
})

// 用户认证 ============================================================
app.use('/@test/data/', async (c: Context) => {
    let db: SavesManage = new SavesManage(c);
    let key: DBSelect = {
        main: 'mount',
        keys: {mount_path: '000'},
        data: {
            mount_path: '000',
            mount_type: '111',
            is_enabled: true,
        }
    }
    await db.save(key)
    console.log(await db.find(key))
    key.data = {
        mount_type: '222',
        is_enabled: false,
    }
    await db.save(key)
    console.log(await db.find(key))
    console.log(await db.kill(key))
    console.log(await db.find(key))
    return c.text('Hello Hono!')
})
export default app
