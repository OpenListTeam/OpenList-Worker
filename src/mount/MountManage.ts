import {Context} from "hono";
import {SavesManage} from "../saves/SavesManage";
import {DBResult} from "../saves/SavesObject";
import * as sys from "../drive/DriveSelect";
import {DriveResult} from "../drive/DriveObject";

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


    /**
     * 过滤挂载点，返回与指定路径相关的挂载点和子目录挂载
     *
     * 功能：
     * 1. 查找访问路径的最长前缀匹配挂载点（用于载入驱动和列出文件）
     * 2. 查找访问路径的子一级目录挂载点（作为文件夹返回）
     *
     * 示例：访问 "/sub/" 时
     * - 挂载点：["/", "/sub/", "/sub/temp/", "/tests/"]
     * - 最长前缀匹配："/sub/" 或 "/" （如果没有"/sub/"）
     * - 子一级目录："/sub/temp/" （作为文件夹显示）
     * - 不会匹配："/tests/" （与访问路径无关）
     *
     * @param mount_path 要匹配的路径
     * @param fetch_full 是否返回完整驱动列表（包含主驱动和子目录驱动）
     * @param check_flag 是否检查挂载点启用状态
     * @returns 驱动实例或驱动数组，如果没有匹配则返回null
     */
    async filter(mount_path: string,
                 fetch_full: boolean = false,
                 check_flag: boolean = false): Promise<any[]> {
        let all_mount: MountResult = await this.select();
        let out_mount: any[] = [];
        let max_check: string = '';

        // 标准化路径：去掉末尾的/（但保留根路径/）
        mount_path = mount_path === '/' ? '/' : mount_path.replace(/\/+$/, '');

        for (const now_mount of all_mount.data) {
            if (check_flag && !now_mount.is_enabled) continue;

            // 标准化挂载点路径
            now_mount.mount_path = now_mount.mount_path === '/' ? '/' : now_mount.mount_path.replace(/\/+$/, '');

            // 检查最长前缀匹配
            if (mount_path.startsWith(now_mount.mount_path) && now_mount.mount_path.length > max_check.length) {
                max_check = now_mount.mount_path;
            }

            // 检查嵌套挂载
            if (now_mount.mount_path.startsWith(mount_path) && now_mount.mount_path !== mount_path) {
                const sub_path = now_mount.mount_path.substring(mount_path.length).replace(/^\/+/, '');
                if (sub_path) {
                    let driver_item: any = sys.driver_list[now_mount.mount_type];
                    out_mount.push(new driver_item(
                        this.c,
                        now_mount.mount_path,
                        JSON.parse(now_mount.drive_conf || "{}"),
                        JSON.parse(now_mount.drive_save || "{}")
                    ));
                }
            }
        }

        // 处理主驱动
        if (max_check) {
            const main_mount = all_mount.data.find((m: { mount_path: string; }) => m.mount_path === max_check);
            if (main_mount) {
                let driver_item: any = sys.driver_list[main_mount.mount_type];
                out_mount.unshift(new driver_item(
                    this.c,
                    max_check,
                    JSON.parse(main_mount.drive_conf || "{}"),
                    JSON.parse(main_mount.drive_save || "{}")
                ));
            }
        } else {
            out_mount.unshift(null);
        }

        return out_mount;
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
        // 为新创建的挂载点添加初始日志
        config.drive_logs = `${new Date().toISOString()}: Mount Created`;
        const result = await this.config(config);
        await this.reload(config.mount_path);
        return result
    }

    async reload(config: MountConfig | string): Promise<MountResult> {
        if (typeof config === "string") config = {mount_path: config}
        console.log("@mount reload path", config)
        const driver: any[] = await this.filter(config.mount_path);
        console.log("@reload before init", config)
        if (!driver) {
            const errorMessage = "Mount Path Not Found";
            // 更新日志信息
            await this.config({
                mount_path: config.mount_path,
                drive_logs: errorMessage
            });
            return {
                flag: false,
                text: errorMessage,
            }
        }
        // 添加挂载 =========================================
        const driveResult: DriveResult = await driver[0].initSelf();

        // 无论成功还是失败，都要保存drive_save和drive_logs
        console.log("@reload after init", config.drive_save)
        config.drive_save = JSON.stringify(driver[0].saving) || "{}";
        config.drive_logs = driveResult.text || "OK";

        // 保存配置到数据库
        await this.config(config);
        return {
            flag: driveResult.flag,
            text: driveResult.text,
        }
    }

    async loader(config: MountConfig | string | any,
                 fetch_full: boolean = false,
                 check_flag: boolean = false): Promise<any> {
        if (typeof config === "string") config = {mount_path: config}
        const driver_list: any[] = await this.filter(
            config.mount_path, fetch_full, check_flag);
        if (!driver_list) return null
        const driver_core = driver_list[0];

        // 如果driver_core为null（没有匹配的主挂载点），直接返回driver_list
        if (driver_core === null || driver_core === undefined) {
            console.log("@loader", "没有匹配的主挂载点，直接返回子挂载点列表")
            return driver_list;
        }

        // 查看driver_core的详细信息
        console.log("@loader", "driver_core类型:", typeof driver_core);
        console.log("@loader", "driver_core构造函数名:", driver_core.constructor.name);
        console.log("@loader", "driver_core所有属性:", Object.getOwnPropertyNames(driver_core));
        console.log("@loader", "driver_core原型方法:", Object.getOwnPropertyNames(Object.getPrototypeOf(driver_core)));

        // 查看一些常见属性
        // if (driver_core.router) console.log("@loader", "router:", driver_core.router);
        // if (driver_core.saving) console.log("@loader", "saving:", JSON.stringify(driver_core.saving, null, 2));
        // if (driver_core.change !== undefined) console.log("@loader", "change:", driver_core.change);

        console.log("@loader", "Find driver successfully")
        // 加载挂载 ========================================================
        const result: DriveResult = await driver_core.loadSelf();
        console.log("@loader", "loadSelf结果:", JSON.stringify(result, null, 2));
        console.log("@loader", "driver_core.change:", driver_core.change);
        if (!result.flag) return null;
        console.log("@loader", "Load driver successfully")
        console.log("driver_core.change", driver_core.change)
        if (driver_core.change) {
            // 重新从数据库内读取 ==========================================
            config = await this.select(driver_core.router);
            if (!config.data || config.data.length <= 0) return driver_list
            config.data[0].drive_save = JSON.stringify(driver_core.saving)
            config.data[0].drive_logs = result.text;
            console.log("Updating config:", JSON.stringify(config.data[0], null, 2))
            await this.config(config.data[0])
        }
        return driver_list
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

        // 过滤掉undefined值，避免数据库错误
        const cleanConfig: MountConfig = {mount_path: ""};
        for (const [key, value] of Object.entries(config)) {
            if (value !== undefined) {
                cleanConfig[key as keyof MountConfig] = value;
            }
        }

        const result: DBResult = await db.save({
            main: "mount",
            keys: {"mount_path": config.mount_path},
            data: cleanConfig,
        });
        return {
            flag: result.flag,
            text: result.text,
        }
    }

    /**
     * 获取所有可用的驱动列表。
     * @returns 返回操作结果，包含成功标志、描述信息和驱动列表数据。
     */
    async driver(): Promise<MountResult> {
        try {
            const {getAvailableDrivers} = await import('../drive/DriveSelect');
            const drivers = getAvailableDrivers();
            return {
                flag: true,
                text: 'Driver list retrieved successfully',
                data: drivers,
            };
        } catch (error) {
            return {
                flag: false,
                text: 'Failed to retrieve driver list: ' + (error as Error).message,
                data: [],
            };
        }
    }

}