import {Context, Hono} from 'hono'
import {SavesManage} from "./saves/SavesManage";
import {MountManage} from "./mount/MountManage";
import {D1Database, KVNamespace} from "@cloudflare/workers-types";
import {getConfig} from "./share/HonoParsers";
import {DBSelect} from "./saves/SavesObject";
import {UsersManage} from "./users/UsersManage";
import {FilesManage} from "./files/FilesManage";


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

// 挂载管理 ##############################################################################
app.use('/@mount/:action/:method/*', async (c: Context) => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const config: Record<string, any> = await getConfig(c, 'config');
    // console.log("@mount", action, method, config)
    // 创建对象 ==========================================================================
    let mounts: MountManage = new MountManage(c);
    // 检查方法 ==========================================================================
    switch (method) {
        case "path": { // 筛选路径 =======================================================
            config.mount_path = c.req.path.split('/').slice(4).join('/');
            break;
        }
        case "uuid": { // 筛选编号 =======================================================
            const result: MountResult = await mounts.select();
            if (!result.data) return c.json({
                flag: false, text: 'No UUID Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    console.log("@mount", action, method, config)
    // 检查参数 ==========================================================================
    if (!config.mount_path && action != "select")
        return c.json({flag: false, text: 'Invalid Path'}, 400)
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找挂载 =====================================================
            const result: MountResult = await mounts.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建挂载 =====================================================
            console.log("@mount", action, method, config)
            if (!config.mount_path || !config.mount_type || !config.drive_conf)
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            let result: MountResult = await mounts.create(config as MountConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除挂载 =====================================================
            let result: MountResult = await mounts.remove(config.mount_path);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置挂载 =====================================================
            let result: MountResult = await mounts.config(config as MountConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "reload": { // 载入挂载 =====================================================
            let result: MountResult = await mounts.reload(config.mount_path);
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})


// 用户管理 ##############################################################################
app.use('/@users/:action/:method/:source', async (c: Context) => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = c.req.param('source');
    const config: Record<string, any> = await getConfig(c, 'config');
    // console.log("@mount", action, method, config)
    // 创建对象 ==========================================================================
    let users: UsersManage = new UsersManage(c);
    // 检查方法 ==========================================================================
    switch (method) {
        case "name": { // 筛选编号 =======================================================
            const result: UsersResult = await users.select(source);
            if (!result.data) return c.json({
                flag: false, text: 'No UUID Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    console.log("@mount", action, method, config)
    // 检查参数 ==========================================================================
    if (!config.users_name && action != "select")
        return c.json({flag: false, text: 'Invalid Name'}, 400)
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找用户 ===================================
            const result: UsersResult = await users.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建用户 ===================================
            let result: UsersResult = await users.create(config as UsersConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除用户 ===================================
            let result: UsersResult = await users.remove(config.users_name);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置用户 ===================================
            let result: UsersResult = await users.config(config as UsersConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "login": { // 登录用户 ====================================
            let result: UsersResult = await users.log_in();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "logout": {// 登出用户 ====================================
            let result: UsersResult = await users.logout();
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})


// 文件管理 ##############################################################################
app.use('/@files/:action/:method/*', async (c: Context): Promise<Response> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    // 创建对象 ==========================================================================
    const source: string = c.req.path.split('/').slice(4).join('/');
    const target: string | undefined = c.req.query('target');
    const driver: string | undefined = c.req.query('driver');
    const config: Record<string, any> = await getConfig(c, 'config');
    // 检查方法 ==========================================================================
    switch (method) {
        case "path": { // 筛选路径 =======================================================
            config.mount_path = target
            break;
        }
        case "uuid": { // 筛选编号 =======================================================
            break; // TODO: 使用UUID查找文件
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    const files: FilesManage = new FilesManage(c);
    return await files.action(action, source, target, config);
})


// // 文件访问 ##############################################################################
// app.use('/:action/*', async (c: Context): Promise<Response> => {
//     const action: string = c.req.param('action');
//     const source: string = c.req.path.split('/').slice(1).join('/');
//     const action_map: Record<string, string> = {
//         "l": "list", "d": "link",
//         "r": "remove", "c": "create",
//     }
//     const files: FilesManage = new FilesManage(c);
//     return await files.action(action_map[action], source, "", {});
// })


// 页面访问 ##############################################################################
app.use('*', async (c: Context): Promise<Response> => {
    // TODO:  增加虚拟主机功能，指定域名直接访问进行下载，否则返回页面
    console.log(c.req.path)
    const source: string = c.req.path.split('/').slice(1).join('/');
    const files: FilesManage = new FilesManage(c);
    return await files.action("list", source, "", {});
})



// 用户认证 ==============================================================================
// app.use('/@test/data/', async (c: Context) => {
//     let db: SavesManage = new SavesManage(c);
//     let key: DBSelect = {
//         main: 'mount',
//         keys: {mount_path: '000'},
//         data: {
//             mount_path: '000',
//             mount_type: '111',
//             is_enabled: true,
//         }
//     }
//     await db.save(key)
//     console.log(await db.find(key))
//     key.data = {
//         mount_type: '222',
//         is_enabled: false,
//     }
//     await db.save(key)
//     console.log(await db.find(key))
//     console.log(await db.kill(key))
//     console.log(await db.find(key))
//     return c.text('Hello Hono!')
// })

export default app