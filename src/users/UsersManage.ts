import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";

/**
 * 用户管理类，用于处理用户的创建、删除、配置和查询操作。
 */
export class UsersManage {
    public c: Context

    /**
     * 构造函数，初始化上下文。
     * @param c - Hono框架的上下文对象。
     */
    constructor(c: Context) {
        this.c = c
    }

    /**
     * 创建用户。
     * @param user - 用户配置信息。
     * @returns 返回操作结果，包含成功标志和描述信息。
     */
    async create(user: UsersConfig): Promise<UsersResult> {
        const db = new SavesManage(this.c);
        // 检查用户是否已经存在 =============================
        const old_user: DBResult = await db.find({
            main: "user",
            keys: {"username": user.users_name},
        });
        if (old_user.data.length > 0)
            return {
                flag: false,
                text: "user already exists",
            }
        // 添加用户 =========================================
        return await this.config(user);
    }

    /**
     * 删除用户。
     * @param username - 用户名。
     * @returns 返回操作结果，包含成功标志和描述信息。
     */
    async remove(username: string): Promise<UsersResult> {
        const db = new SavesManage(this.c);
        const result: DBResult = await db.kill({
            main: "user",
            keys: {"username": username},
        });
        return {
            flag: result.flag,
            text: result.text,
        }
    }

    /**
     * 配置用户。
     * @param user - 用户配置信息。
     * @returns 返回操作结果，包含成功标志和描述信息。
     */
    async config(user: UsersConfig): Promise<UsersResult> {
        const db = new SavesManage(this.c);
        const result: DBResult = await db.save({
            main: "user",
            keys: {"username": user.users_name},
            data: user,
        });
        return {
            flag: result.flag,
            text: result.text,
        }
    }

    /**
     * 查询用户信息。
     * @param users_name - 可选参数，指定用户名。若未提供，则查询所有用户。
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据。
     */
    async select(users_name?: string): Promise<UsersResult> {
        const db = new SavesManage(this.c);
        const result: DBResult = await db.find({
            main: "user",
            keys: users_name ? {users_name: users_name} : {},
        });
        let result_data: UsersConfig[] = []
        if (result.data.length > 0) {
            for (const item of result.data) {
                result_data.push(item as UsersConfig)
            }
        }
        return {
            flag: result.flag,
            text: result.text,
            data: result_data,
        }
    }

    async log_in(){
        // TODO: 登录逻辑
        return {
            flag: true,
            text: "",
        }
    }

    async logout(){
        // TODO: 登录逻辑
        return {
            flag: true,
            text: "",
        }
    }
}