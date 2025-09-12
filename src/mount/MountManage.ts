import {Context} from "hono";
import {DataManage} from "../data/SavesManage";
import {DBResult} from "../saves/SavesObject";

/**
 * 挂载点管理类，用于处理挂载点的创建、删除、配置和查询操作。
 */
class MountManage {
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
        const db = new DataManage(this.c);
        // 检查路径是否已经存在 =============================
        const old_mount: DBResult = await db.find({
            main: "mount",
            keys: {"path": config.mount_path},
        });
        if (old_mount.data.length > 0)
            return {
                flag: false,
                text: "mount path already exists",
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
        const db = new DataManage(this.c);
        const result: DBResult = await db.kill({
            main: "mount",
            keys: {"path": mount_path},
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
        const db = new DataManage(this.c);
        const result: DBResult = await db.save({
            main: "mount",
            keys: {"path": config.mount_path},
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
        const db = new DataManage(this.c);
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
}