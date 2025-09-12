import {Context} from "hono";
import {SavesManage} from "../saves/SavesManage";
import {DBResult} from "../saves/SavesObject";
import * as fsd from "../drive/FileDriver";

/**
 * 挂载点管理类，用于处理挂载点的创建、删除、配置和查询操作。
 */
export class MountManage {
    public c: Context

    /**
     * 构造函数，初始化上下文。
     * @param c - Hono框架的上下文对象。
     */
    constructor(c: Context) {
        this.c = c
    }

    /**
     * 创建挂载点。
     * @param config - 挂载点配置信息。
     * @returns 返回操作结果，包含成功标志和描述信息。
     */
    async create(config: MountConfig): Promise<MountResult> {
        const db = new SavesManage(this.c);
        // 检查路径是否已经存在 =============================
        const old_mount: DBResult = await db.find({
            main: "mount",
            keys: {"mount_path": config.mount_path},
        });
        if (old_mount.data.length > 0)
            return {
                flag: false,
                text: "mount path already exists",
            }
        // 添加挂载 =========================================
        return await this.config(config);
    }

    async reload(config: MountConfig): Promise<MountResult> {
        const db = new SavesManage(this.c);
        // 检查路径是否已经存在 =============================
        const old_mount: DBResult = await db.find({
            main: "mount",
            keys: {"mount_path": config.mount_path},
        });
        if (old_mount.data.length <= 0)
            return {
                flag: false,
                text: "mount path not found",
            }
        // 添加挂载 =========================================
        return await this.config(config);
    }

    /**
     * 删除挂载点。
     * @param mount_path - 挂载点路径。
     * @returns 返回操作结果，包含成功标志和描述信息。
     */
    async remove(mount_path: string): Promise<MountResult> {
        const db = new SavesManage(this.c);
        const result: DBResult = await db.kill({
            main: "mount",
            keys: {"mount_path": mount_path},
        });
        return {
            flag: result.flag,
            text: result.text,
        }
    }

    /**
     * 配置挂载点。
     * @param config - 挂载点配置信息。
     * @returns 返回操作结果，包含成功标志和描述信息。
     */
    async config(config: MountConfig): Promise<MountResult> {
        const db = new SavesManage(this.c);
        const result: DBResult = await db.save({
            main: "mount",
            keys: {"mount_path": config.mount_path},
            data: config,
        });
        return {
            flag: result.flag,
            text: result.text,
        }
    }

    /**
     * 查询挂载点信息。
     * @param mount_path - 可选参数，指定挂载点路径。若未提供，则查询所有挂载点。
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据。
     */
    async select(mount_path?: string): Promise<MountResult> {
        const db = new SavesManage(this.c);
        const result: DBResult = await db.find({
            main: "mount",
            keys: mount_path ? {mount_path: mount_path} : {},
        });
        let result_data: MountConfig[] = []
        if (result.data.length > 0) {
            for (const item of result.data) {
                result_data.push(item as MountConfig)
            }
        }
        return {
            flag: result.flag,
            text: result.text,
            data: result_data,
        }
    }

    // async ( now_path: string) {
    //     for (const map_path in path_map) {
    //         console.log(now_path, map_path);
    //         if (now_path.startsWith(map_path)) {
    //             console.log(path_map[map_path]['driverName']);
    //             const sub_path: string = now_path.substring(map_path.length - 1);
    //             let now_conn: fsd.FileDriver = new fsd.FileDriver(
    //                 c, now_path,
    //                 path_map[map_path]['enableFlag'],
    //                 path_map[map_path]['driverName'],
    //                 path_map[map_path]['cachedTime'],
    //                 path_map[map_path]['configData'],
    //                 path_map[map_path]['serverData'],
    //             )
    //             await now_conn.InitDriver();
    //             let now_list = await now_conn.driverConn.listFile(sub_path)
    //             // await now_conn.driverConn.loadSelf()
    //             // await now_conn.driverConn.downFile(sub_path)
    //             // await now_conn.driverConn.killFile(sub_path)
    //             console.log(now_list)
    //         }
    //     }
    // }
}