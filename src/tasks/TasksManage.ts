import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {TasksConfig, TasksResult} from "./TasksObject";
import {v4 as uuidv4} from 'uuid';

/**
 * 任务管理类，用于处理任务的创建、删除、配置和查询操作。
 */
export class TasksManage {
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
     * 创建任务
     * @param tasksData - 任务配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async create(tasksData: TasksConfig): Promise<TasksResult> {
        try {
            // 基本验证
            if (!tasksData.tasks_type || tasksData.tasks_type.length === 0) {
                return {flag: false, text: "任务类型不能为空"};
            }
            if (!tasksData.tasks_user || tasksData.tasks_user.length === 0) {
                return {flag: false, text: "任务用户不能为空"};
            }
            if (!tasksData.tasks_info || tasksData.tasks_info.length === 0) {
                return {flag: false, text: "任务信息不能为空"};
            }

            // 生成UUID
            const tasks_uuid = tasksData.tasks_uuid || uuidv4();

            // 检查任务是否已经存在
            const find_task: DBResult = await this.d.find({
                main: "tasks", 
                keys: {"tasks_uuid": tasks_uuid}
            });
            if (find_task.data.length > 0) {
                return {flag: false, text: "任务已存在"};
            }

            // 验证任务信息格式（简单的JSON格式检查）
            try {
                JSON.parse(tasksData.tasks_info);
            } catch (e) {
                return {flag: false, text: "任务信息格式不正确，必须是有效的JSON"};
            }

            // 验证任务类型
            const validTypes = ['upload', 'download', 'sync', 'backup', 'compress', 'extract', 'convert', 'scan', 'cleanup', 'other'];
            if (!validTypes.includes(tasksData.tasks_type)) {
                return {flag: false, text: "任务类型无效"};
            }

            // 创建完整的任务配置
            const tasksConfig: TasksConfig = {
                tasks_uuid: tasks_uuid,
                tasks_type: tasksData.tasks_type,
                tasks_user: tasksData.tasks_user,
                tasks_info: tasksData.tasks_info,
                tasks_flag: tasksData.tasks_flag ?? 0 // 默认状态为0（待处理）
            };

            // 添加任务配置
            return await this.config(tasksConfig);
        } catch (error) {
            console.error("创建任务过程中发生错误:", error);
            return {
                flag: false,
                text: "创建任务失败，请稍后重试"
            };
        }
    }

    /**
     * 删除任务
     * @param tasks_uuid - 任务UUID
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async remove(tasks_uuid: string): Promise<TasksResult> {
        try {
            if (!tasks_uuid || tasks_uuid.length === 0) {
                return {flag: false, text: "任务UUID不能为空"};
            }

            const result: DBResult = await this.d.kill({
                main: "tasks",
                keys: {"tasks_uuid": tasks_uuid},
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("删除任务过程中发生错误:", error);
            return {
                flag: false,
                text: "删除任务失败，请稍后重试"
            };
        }
    }

    /**
     * 配置任务
     * @param tasksData - 任务配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async config(tasksData: TasksConfig): Promise<TasksResult> {
        try {
            const result: DBResult = await this.d.save({
                main: "tasks",
                keys: {"tasks_uuid": tasksData.tasks_uuid},
                data: tasksData,
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("配置任务过程中发生错误:", error);
            return {
                flag: false,
                text: "配置任务失败，请稍后重试"
            };
        }
    }

    /**
     * 查询任务信息
     * @param tasks_uuid - 可选参数，指定任务UUID。若未提供，则查询所有任务
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据
     */
    async select(tasks_uuid?: string): Promise<TasksResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "tasks",
                keys: tasks_uuid ? {tasks_uuid: tasks_uuid} : {},
            });

            let result_data: TasksConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as TasksConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("查询任务信息过程中发生错误:", error);
            return {
                flag: false,
                text: "查询任务信息失败，请稍后重试"
            };
        }
    }

    /**
     * 更新任务状态
     * @param tasks_uuid - 任务UUID
     * @param tasks_flag - 任务状态标志
     * @returns 返回操作结果
     */
    async updateStatus(tasks_uuid: string, tasks_flag: number): Promise<TasksResult> {
        try {
            if (!tasks_uuid || tasks_uuid.length === 0) {
                return {flag: false, text: "任务UUID不能为空"};
            }

            // 验证状态值
            const validFlags = [0, 1, 2, 3, 4]; // 0:待处理, 1:进行中, 2:已完成, 3:失败, 4:已取消
            if (!validFlags.includes(tasks_flag)) {
                return {flag: false, text: "任务状态值无效"};
            }

            // 先查询任务是否存在
            const find_result = await this.select(tasks_uuid);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "任务不存在"};
            }

            const tasksData = find_result.data[0];
            tasksData.tasks_flag = tasks_flag;

            return await this.config(tasksData);
        } catch (error) {
            console.error("更新任务状态过程中发生错误:", error);
            return {
                flag: false,
                text: "更新任务状态失败，请稍后重试"
            };
        }
    }

    /**
     * 根据用户获取任务列表
     * @param tasks_user - 任务用户
     * @returns 返回用户的任务列表
     */
    async getByUser(tasks_user: string): Promise<TasksResult> {
        try {
            if (!tasks_user || tasks_user.length === 0) {
                return {flag: false, text: "任务用户不能为空"};
            }

            const result: DBResult = await this.d.find({
                main: "tasks",
                keys: {tasks_user: tasks_user},
            });

            let result_data: TasksConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as TasksConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("根据用户获取任务列表过程中发生错误:", error);
            return {
                flag: false,
                text: "根据用户获取任务列表失败，请稍后重试"
            };
        }
    }

    /**
     * 根据任务状态获取任务列表
     * @param tasks_flag - 任务状态标志
     * @returns 返回指定状态的任务列表
     */
    async getByStatus(tasks_flag: number): Promise<TasksResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "tasks",
                keys: {tasks_flag: tasks_flag},
            });

            let result_data: TasksConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as TasksConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("根据任务状态获取任务列表过程中发生错误:", error);
            return {
                flag: false,
                text: "根据任务状态获取任务列表失败，请稍后重试"
            };
        }
    }
}