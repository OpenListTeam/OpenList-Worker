import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {FetchConfig, FetchResult} from "./FetchObject";

/**
 * 下载管理类，用于处理离线下载任务的创建、删除、配置和查询操作。
 */
export class FetchManage {
    public c: Context
    public d: SavesManage

    /**
     * 构造函数，初始化上下文。
     * @param c - Hono框架的上下文对象。
     */
    constructor(c: Context) {
        this.c = c
        this.d = new SavesManage(c)
    }

    /**
     * 创建下载任务
     * @param fetchData - 下载任务配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async create(fetchData: FetchConfig): Promise<FetchResult> {
        try {
            // 自动生成UUID（如果未提供）
            if (!fetchData.fetch_uuid || fetchData.fetch_uuid.length === 0) {
                fetchData.fetch_uuid = `fetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            if (!fetchData.fetch_from || fetchData.fetch_from.length === 0) {
                return {flag: false, text: "下载源地址不能为空"};
            }
            if (!fetchData.fetch_dest || fetchData.fetch_dest.length === 0) {
                return {flag: false, text: "目标路径不能为空"};
            }
            if (!fetchData.fetch_user || fetchData.fetch_user.length === 0) {
                return {flag: false, text: "用户名不能为空"};
            }

            // 检查任务是否已经存在
            const find_task: DBResult = await this.d.find({
                main: "fetch", 
                keys: {"fetch_uuid": fetchData.fetch_uuid}
            });
            if (find_task.data.length > 0) {
                return {flag: false, text: "下载任务已存在"};
            }

            // 创建完整的下载任务配置
            const taskConfig: FetchConfig = {
                fetch_uuid: fetchData.fetch_uuid,
                fetch_from: fetchData.fetch_from,
                fetch_dest: fetchData.fetch_dest,
                fetch_user: fetchData.fetch_user,
                fetch_flag: fetchData.fetch_flag ?? 0 // 默认状态为0（等待中）
            };

            // 添加下载任务
            return await this.config(taskConfig);
        } catch (error) {
            console.error("创建下载任务过程中发生错误:", error);
            return {
                flag: false,
                text: "创建下载任务失败，请稍后重试"
            };
        }
    }

    /**
     * 删除下载任务
     * @param fetch_uuid - 任务UUID
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async remove(fetch_uuid: string): Promise<FetchResult> {
        try {
            if (!fetch_uuid || fetch_uuid.length === 0) {
                return {flag: false, text: "任务UUID不能为空"};
            }

            const result: DBResult = await this.d.kill({
                main: "fetch",
                keys: {"fetch_uuid": fetch_uuid},
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("删除下载任务过程中发生错误:", error);
            return {
                flag: false,
                text: "删除下载任务失败，请稍后重试"
            };
        }
    }

    /**
     * 配置下载任务
     * @param fetchData - 下载任务配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async config(fetchData: FetchConfig): Promise<FetchResult> {
        try {
            const result: DBResult = await this.d.save({
                main: "fetch",
                keys: {"fetch_uuid": fetchData.fetch_uuid},
                data: fetchData,
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("配置下载任务过程中发生错误:", error);
            return {
                flag: false,
                text: "配置下载任务失败，请稍后重试"
            };
        }
    }

    /**
     * 查询下载任务信息
     * @param fetch_uuid - 可选参数，指定任务UUID。若未提供，则查询所有任务
     * @param fetch_user - 可选参数，指定用户名。若提供，则只查询该用户的任务
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据
     */
    async select(fetch_uuid?: string, fetch_user?: string): Promise<FetchResult> {
        try {
            let keys: any = {};
            if (fetch_uuid) keys.fetch_uuid = fetch_uuid;
            if (fetch_user) keys.fetch_user = fetch_user;

            const result: DBResult = await this.d.find({
                main: "fetch",
                keys: keys,
            });

            let result_data: FetchConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as FetchConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("查询下载任务过程中发生错误:", error);
            return {
                flag: false,
                text: "查询下载任务失败，请稍后重试"
            };
        }
    }

    /**
     * 更新下载任务状态
     * @param fetch_uuid - 任务UUID
     * @param fetch_flag - 新的任务状态
     * @returns 返回操作结果
     */
    async updateStatus(fetch_uuid: string, fetch_flag: number): Promise<FetchResult> {
        try {
            if (!fetch_uuid || fetch_uuid.length === 0) {
                return {flag: false, text: "任务UUID不能为空"};
            }

            // 先查询任务是否存在
            const find_result = await this.select(fetch_uuid);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "下载任务不存在"};
            }

            const taskData = find_result.data[0];
            taskData.fetch_flag = fetch_flag;

            return await this.config(taskData);
        } catch (error) {
            console.error("更新下载任务状态过程中发生错误:", error);
            return {
                flag: false,
                text: "更新下载任务状态失败，请稍后重试"
            };
        }
    }

    /**
     * 根据用户获取下载任务列表
     * @param fetch_user - 用户名
     * @returns 返回该用户的所有下载任务
     */
    async getUserTasks(fetch_user: string): Promise<FetchResult> {
        return await this.select(undefined, fetch_user);
    }

    /**
     * 根据状态获取下载任务列表
     * @param fetch_flag - 任务状态
     * @param fetch_user - 可选参数，指定用户名
     * @returns 返回指定状态的下载任务
     */
    async getTasksByStatus(fetch_flag: number, fetch_user?: string): Promise<FetchResult> {
        try {
            let keys: any = {fetch_flag: fetch_flag};
            if (fetch_user) keys.fetch_user = fetch_user;

            const result: DBResult = await this.d.find({
                main: "fetch",
                keys: keys,
            });

            let result_data: FetchConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as FetchConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("根据状态查询下载任务过程中发生错误:", error);
            return {
                flag: false,
                text: "查询下载任务失败，请稍后重试"
            };
        }
    }
}