import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import * as bcrypt from "bcryptjs";
import {UsersConfig, UsersResult} from "./UsersObject";

const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 用户管理类，用于处理用户的创建、删除、配置和查询操作。
 */
export class UsersManage {
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
     * 创建用户
     * @param userData - 用户配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async create(userData: UsersConfig): Promise<UsersResult> {
        try {
            // 基本验证 ==============================================================================================
            if (!userData.users_name || userData.users_name.length < 5) return {flag: false, text: "用户至少5个字符"};
            if (!userData.users_pass || userData.users_pass.length < 6) return {flag: false, text: "登录至少6个字符"};
            // 验证邮箱 ==============================================================================================
            if (userData.users_mail) if (!reg.test(userData.users_mail)) return {flag: false, text: "邮箱格式不正确"};
            // 检查用户是否已经存在 ==================================================================================
            const find_user: DBResult = await this.d.find({main: "users", keys: {"users_name": userData.users_name}});
            if (find_user.data.length > 0) return {flag: false, text: "用户已存在"};
            // 创建完整的用户配置
            const userConfig: UsersConfig = {
                users_name: userData.users_name,
                users_mail: userData.users_mail || "",
                users_pass: await bcrypt.hash(userData.users_pass, 10),
                users_mask: "",
                is_enabled: userData.is_enabled ?? true,
                total_size: userData.total_size ?? 1024 * 1024 * 1024, // 默认1GB存储空间
                total_used: userData.total_used ?? 0,
                oauth_data: userData.oauth_data ?? "",
                mount_data: userData.mount_data ?? ""
            };
            // 添加用户
            return await this.config(userConfig);
        } catch (error) {
            console.error("创建用户过程中发生错误:", error);
            return {
                flag: false,
                text: "创建用户失败，请稍后重试"
            };
        }
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
            main: "users",
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
            main: "users",
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

    /**
     * 用户登录
     * @param loginData - 登录数据
     * @returns 返回操作结果，包含JWT token
     */
    async log_in(loginData: UsersConfig): Promise<UsersResult> {
        try {
            // 验证输入数据
            if (!loginData.users_name || !loginData.users_pass) {
                return {
                    flag: false,
                    text: "用户名和密码不能为空"
                };
            }

            const db = new SavesManage(this.c);

            // 查找用户
            const userResult: DBResult = await db.find({
                main: "users",
                keys: {"users_name": loginData.users_name},
            });

            if (userResult.data.length === 0) {
                return {
                    flag: false,
                    text: "用户名或密码错误"
                };
            }

            const userData = userResult.data[0] as any;

            // 检查用户是否被禁用
            if (!userData.is_enabled) {
                return {
                    flag: false,
                    text: "账户已被禁用"
                };
            }

            // 使用bcrypt验证密码
            const isPasswordValid = await bcrypt.compare(loginData.users_pass, userData.users_pass);

            if (!isPasswordValid) {
                return {
                    flag: false,
                    text: "用户名或密码错误"
                };
            }

            // 生成简单的token（可以后续改为JWT）
            const token = userData.users_name + "_" + Date.now().toString(36);

            // 返回用户信息（不包含敏感数据）
            const userInfo: UsersConfig = {
                users_name: userData.users_name,
                users_mail: userData.users_mail,
                is_enabled: userData.is_enabled,
                total_size: userData.total_size,
                total_used: userData.total_used
            };

            return {
                flag: true,
                text: "登录成功",
                token: token,
                data: [userInfo]
            };

        } catch (error) {
            console.error("登录过程中发生错误:", error);
            return {
                flag: false,
                text: "登录失败，请稍后重试"
            };
        }
    }

    /**
     * 用户登出
     * @param token - JWT token（可选，用于记录日志）
     * @returns 返回操作结果
     */
    async logout(token?: string): Promise<UsersResult> {
        try {
            // 在实际应用中，可以将token加入黑名单
            // 这里简单返回成功状态
            return {
                flag: true,
                text: "登出成功"
            };
        } catch (error) {
            console.error("登出过程中发生错误:", error);
            return {
                flag: false,
                text: "登出失败"
            };
        }
    }

    /**
     * 验证简单token并获取用户信息
     * @param token - 简单token
     * @returns 返回用户信息或null
     */
    async verifyToken(token: string): Promise<UsersConfig | null> {
        try {
            // 解析简单token格式: username_timestamp
            const parts = token.split('_');
            if (parts.length < 2) {
                return null;
            }

            const username = parts.slice(0, -1).join('_'); // 支持用户名中包含下划线

            // 验证用户是否存在且启用
            const db = new SavesManage(this.c);
            const userResult: DBResult = await db.find({
                main: "users",
                keys: {"users_name": username},
            });

            if (userResult.data.length === 0) {
                return null;
            }

            const userData = userResult.data[0] as any;

            if (!userData.is_enabled) {
                return null;
            }

            return {
                users_name: userData.users_name,
                users_mail: userData.users_mail,
                is_enabled: userData.is_enabled,
                total_size: userData.total_size,
                total_used: userData.total_used
            };

        } catch (error) {
            console.error("Token验证失败:", error);
            return null;
        }
    }

    /**
     * 检查用户权限
     * @param c - Hono上下文对象
     * @returns 返回权限检查结果
     */
    static async checkAuth(c: Context): Promise<UsersResult> {
        try {
            // 从请求头获取Authorization token
            const authHeader = c.req.header('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    flag: false,
                    text: "用户未登录"
                };
            }

            const token = authHeader.replace('Bearer ', '');
            const users = new UsersManage(c);
            const userInfo = await users.verifyToken(token);

            if (!userInfo) {
                return {
                    flag: false,
                    text: "用户未登录"
                };
            }

            return {
                flag: true,
                text: "权限验证成功",
                data: [userInfo]
            };

        } catch (error) {
            console.error("权限检查失败:", error);
            return {
                flag: false,
                text: "用户未登录"
            };
        }
    }
}