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
     * 过滤挂载点，返回与指定路径相关的挂载点
     * 
     * 匹配规则：
     * 1. 精确匹配：挂载点路径与访问路径完全相同
     * 2. 父级挂载：挂载点是访问路径的父级（特别处理根路径 "/" 作为所有路径的父级）
     * 3. 子级挂载：挂载点是访问路径的子级（挂载点以访问路径开头）
     * 
     * 排序规则：
     * 1. 精确匹配优先
     * 2. 其他匹配按路径长度降序排列
     * 
     * 示例场景：
     * - 挂载点：["/", "/test/", "/sub/", "/sub/temp"]，访问路径："/sub/"
     *   匹配结果：["/sub/", "/sub/temp", "/"]
     *   说明："/sub/" 精确匹配优先，"/sub/temp" 是子级，"/" 是父级，"/test/" 无关不匹配
     * 
     * - 挂载点：["/", "/sub/"]，访问路径："/sub/"
     *   匹配结果：["/sub/", "/"]
     *   说明："/sub/" 精确匹配，"/" 是父级
     * 
     * @param mount_path 要匹配的路径？
     * @param fetch_full 只要父级信息？
     * @param check_flag 是否检查标志？
     * @returns 匹配的挂载点数组或null
     */
    async filter(mount_path: string,
                 fetch_full: boolean = false,
                 check_flag: boolean = false): Promise<any | null> {
        const all_mounts: MountResult = await this.select();
        // console.log("@filter", all_mounts);
        if (!all_mounts.data || all_mounts.data.length <= 0) return null;

        // 标准化输入路径
        const normalized_path = mount_path.replace(/\/$/, '');

        // 找到所有匹配的挂载点
        const matched_mounts: MountConfig[] = [];
        for (const now_mount of all_mounts.data) {
            // 如果启用check_flag，过滤掉未启用的挂载点
            if (check_flag && (now_mount.is_enabled === null || now_mount.is_enabled === 0)) {
                console.log("@filter skipped disabled mount", now_mount.mount_path);
                continue;
            }
            
            const mount_save: string = now_mount.mount_path.replace(/\/$/, '');
            console.log("@filter now", mount_save, normalized_path);
            
            // 正确的匹配逻辑：
            // 1. 精确匹配：挂载点路径与访问路径完全相同
            // 2. 父级挂载：挂载点是访问路径的父级（访问路径以挂载点开头）
            // 3. 子级挂载：挂载点是访问路径的子级（挂载点以访问路径开头）
            const isExactMatch = normalized_path === mount_save;
            const isParentMount = (mount_save === '' && normalized_path !== '') || // 根路径是所有非根路径的父级
                                  (mount_save !== '' && normalized_path.startsWith(mount_save + '/'));
            const isChildMount = mount_save.startsWith(normalized_path + '/');
            
            if (isExactMatch || isParentMount || isChildMount) {
                matched_mounts.push(now_mount);
                console.log("@filter matched", mount_save, normalized_path);
            }
        }

        // 如果没有匹配的挂载点，返回null
        if (matched_mounts.length === 0) return null;

        // 对匹配的挂载点进行排序：精确匹配优先，然后按路径长度排序
        matched_mounts.sort((a, b) => {
            const mount_a = a.mount_path.replace(/\/$/, '');
            const mount_b = b.mount_path.replace(/\/$/, '');
            
            // 精确匹配的排在最前面
            const isExactA = mount_a === normalized_path;
            const isExactB = mount_b === normalized_path;
            
            if (isExactA && !isExactB) return -1;
            if (!isExactA && isExactB) return 1;
            
            // 如果都是精确匹配或都不是精确匹配，按路径长度排序（长路径优先）
            return mount_b.length - mount_a.length;
        });

        if (fetch_full) {
            // 返回匹配路径下的所有下一级路径的驱动列表
            const result_drivers: any[] = [];
            
            // 1. 找到精确匹配或最长匹配的主驱动
            let main_mount: MountConfig | null = null;
            
            // 首先查找精确匹配
            for (const mount of matched_mounts) {
                const mount_path = mount.mount_path.replace(/\/$/, '');
                if (mount_path === normalized_path) {
                    main_mount = mount;
                    break;
                }
            }
            
            // 如果没有精确匹配，找最长匹配（作为父级）
            if (!main_mount) {
                for (const mount of matched_mounts) {
                    const mount_path = mount.mount_path.replace(/\/$/, '');
                    if (normalized_path.startsWith(mount_path)) {
                        if (!main_mount || mount_path.length > main_mount.mount_path.replace(/\/$/, '').length) {
                            main_mount = mount;
                        }
                    }
                }
            }

            // 添加主驱动
            if (main_mount && main_mount.mount_type) {
                let driver_item: any = sys.driver_list[main_mount.mount_type];
                if (driver_item) {
                    result_drivers.push(new driver_item(
                        this.c,
                        main_mount.mount_path.replace(/\/$/, ''),
                        JSON.parse(main_mount.drive_conf || "{}"),
                        JSON.parse(main_mount.drive_save || "{}")
                    ));
                }
            }

            // 2. 找到所有直接子目录驱动
            for (const mount of matched_mounts) {
                const mount_path = mount.mount_path.replace(/\/$/, '');
                
                // 检查是否是输入路径的直接子目录
                if (mount_path.startsWith(normalized_path + '/') && mount.mount_type) {
                    // 确保是直接子目录，不是更深层级
                    const relative_path = mount_path.substring(normalized_path.length + 1);
                    if (!relative_path.includes('/')) {
                        let driver_item: any = sys.driver_list[mount.mount_type];
                        if (driver_item) {
                            result_drivers.push(new driver_item(
                                this.c,
                                mount_path,
                                JSON.parse(mount.drive_conf || "{}"),
                                JSON.parse(mount.drive_save || "{}")
                            ));
                        }
                    }
                }
            }

            console.log("@filter fetch_full result count:", result_drivers.length);
            return result_drivers;
        } else {
            // 默认行为：找到最长路径的挂载点，返回单个driver
            let longest_mount: MountConfig = matched_mounts[0];
            for (const mount of matched_mounts) {
                const current_path = mount.mount_path.replace(/\/$/, '');
                const longest_path = longest_mount.mount_path.replace(/\/$/, '');
                if (current_path.length > longest_path.length) {
                    longest_mount = mount;
                }
            }

            console.log("@filter hit longest", longest_mount.mount_path, normalized_path);
            if (!longest_mount.mount_type) return null;

            let driver_item: any = sys.driver_list[longest_mount.mount_type];
            // console.log(driver_item, longest_mount.mount_type, sys.driver_list)
            // console.log(driver_item)
            console.log("@filter Config:", longest_mount.mount_path)
            return new driver_item(
                this.c,
                longest_mount.mount_path.replace(/\/$/, ''),
                JSON.parse(longest_mount.drive_conf || "{}"),
                JSON.parse(longest_mount.drive_save || "{}")
            );
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
        // 为新创建的挂载点添加初始日志
        config.drive_logs = `${new Date().toISOString()}: Mount Created`;
        const result = await this.config(config);
        await this.reload(config.mount_path);
        return result
    }

    async reload(config: MountConfig | string): Promise<MountResult> {
        if (typeof config === "string") config = {mount_path: config}
        const driver = await this.filter(config.mount_path);
        console.log("@reload", config)
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
        const driveResult: DriveResult = await driver.initSelf();

        // 无论成功还是失败，都要保存drive_save和drive_logs
        config.drive_save = JSON.stringify(driver.saving) || "{}";
        config.drive_logs = driveResult.text || "OK";

        // 保存配置到数据库
        await this.config(config);
        return {
            flag: driveResult.flag,
            text: driveResult.text,
        }
    }

    async loader(config: MountConfig | string | any): Promise<any> {
        if (typeof config === "string") config = {mount_path: config}
        const driver: any = await this.filter(config.mount_path);
        if (!driver) return null
        console.log("@loader", driver.router)
        console.log("@loader", "Find driver successfully")
        // 加载挂载 =========================================
        const result: DriveResult = await driver.loadSelf();
        console.log("@loader", result, driver.change)
        if (!result.flag) return null;
        console.log("@loader", "Load driver successfully")

        // 更新日志信息
        const logUpdate = {
            mount_path: driver.router,
            drive_logs: result.text
        };

        if (driver.change) {
            // 重新从数据库内读取 ==========================================
            config = await this.select(driver.router);
            // console.log("Updating config:", config)
            if (!config.data || config.data.length <= 0) return driver
            config.data[0].drive_save = JSON.stringify(driver.saving)
            config.data[0].drive_logs = result.text;
            console.log("Updating config:", config.data[0])
            await this.config(config.data[0])
        }
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