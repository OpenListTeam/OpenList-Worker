import {Context} from "hono";
import {SavesManage} from "../saves/SavesManage";
import {DBResult} from "../saves/SavesObject";
import * as sys from "../drive/DriveSelect";

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

    // 过滤器
    async filter(mount_path: string): Promise<any | null> {
        const all_mounts: MountResult = await this.select(mount_path);
        if (!all_mounts.data || all_mounts.data.length <= 0) return null;
        for (const now_mount of all_mounts.data) {
            console.log(now_mount.mount_path, mount_path);
            if (mount_path.startsWith(now_mount.mount_path)) {
                console.log(now_mount.mount_path, mount_path);
                if (!now_mount.mount_type) return null;
                let driver_item: any = sys.driver_list[now_mount.mount_type];
                console.log(driver_item, now_mount.mount_type, sys.driver_list)
                return new driver_item(
                    this.c,
                    mount_path,
                    now_mount.drive_conf,
                    now_mount.drive_save
                );
            }
        }
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
                text: "Mount Path Already Exists",
            }
        // 添加挂载 =========================================
        return await this.config(config);
    }

    async reload(config: MountConfig | string): Promise<MountResult> {
        if (typeof config === "string") config = {mount_path: config}
        const driver = await this.filter(config.mount_path);
        if (!driver) {
            return {
                flag: false,
                text: "Mount Path Not Found",
            }
        }
        // 添加挂载 =========================================
        return await driver.initSelf();
    }

    async loader(config: MountConfig | string): Promise<any> {
        if (typeof config === "string") config = {mount_path: config}
        const driver = await this.filter(config.mount_path);
        if (!driver) {
            return {
                flag: false,
                text: "Mount Path Not Found",
            }
        }
        // 加载挂载 =========================================
        await driver.loadSelf();
        return driver
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
        await this.loader(config);
        return {
            flag: result.flag,
            text: result.text,
        }
    }


}