import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {UsersConfig, UsersResult} from "./UsersObject";
import {GroupManage} from "../group/GroupManage";
import {GroupConfig} from "../group/GroupObject";
import * as bcrypt from 'bcryptjs';
import {sign, verify} from 'hono/jwt';
import {BindsManage} from "../binds/BindsManage";
import {BindsData} from "../binds/BindsObject";

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
        
        // 如果提供了密码，且密码不是bcrypt哈希值，则进行加密
        if (user.users_pass && !user.users_pass.startsWith('$2a$') && !user.users_pass.startsWith('$2b$') && !user.users_pass.startsWith('$2y$')) {
            user.users_pass = await bcrypt.hash(user.users_pass, 10);
        }
        
        const result: DBResult = await db.save({
            main: "users",
            keys: {"users_name": user.users_name},
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
                const userData = item as UsersConfig;
                // 如果用户有用户组，则继承用户组权限
                if (userData.group_name) {
                    const inheritedData = await this.inheritGroupPermissions(userData);
                    result_data.push(inheritedData);
                } else {
                    result_data.push(userData);
                }
            }
        }
        return {
            flag: result.flag,
            text: result.text,
            data: result_data,
        }
    }

    /**
     * 继承用户组权限
     * @param userData - 用户数据
     * @returns 返回继承用户组权限后的用户数据
     */
    async inheritGroupPermissions(userData: UsersConfig): Promise<UsersConfig> {
        try {
            if (!userData.group_name) {
                return userData;
            }

            const groupManage = new GroupManage(this.c);
            const groupResult = await groupManage.select(userData.group_name);

            if (!groupResult.flag || !groupResult.data || groupResult.data.length === 0) {
                return userData;
            }

            const groupData = groupResult.data[0] as GroupConfig;
            const inheritedData = {...userData};

            // 如果用户没有设置权限掩码，则使用用户组的权限掩码
            if (!inheritedData.users_mask && groupData.group_mask) {
                inheritedData.users_mask = groupData.group_mask.toString();
            }

            // 如果用户没有设置启用状态，则使用用户组的启用状态
            if (inheritedData.is_enabled === undefined && groupData.is_enabled !== undefined) {
                inheritedData.is_enabled = groupData.is_enabled === 1;
            }

            return inheritedData;
        } catch (error) {
            console.error("继承用户组权限时发生错误:", error);
            return userData;
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
            if (!loginData.users_name) {
                return {
                    flag: false,
                    text: "用户名不能为空"
                };
            }

            const db = new SavesManage(this.c);

            // 查找用户
            const userResult: DBResult = await db.find({
                main: "users",
                keys: {"users_name": loginData.users_name},
            });

            if (!userResult || !userResult.flag || !userResult.data || userResult.data.length === 0) {
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

            // 验证密码
            if (!loginData.users_pass) {
                return {
                    flag: false,
                    text: "密码不能为空"
                };
            }

            // 验证密码逻辑
            let isPasswordValid = false;

            if (!userData.users_pass || userData.users_pass === "") {
                // 数据库中没有设置密码，直接比较是否为默认密码"admin"
                isPasswordValid = loginData.users_pass === "admin";
            } else {
                // 数据库中有密码，使用bcrypt验证
                isPasswordValid = await bcrypt.compare(loginData.users_pass, userData.users_pass);
            }

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
     * OAuth登录或绑定账户
     * @param oauthUserInfo - OAuth用户信息
     * @returns 返回操作结果，包含JWT token
     */
    async oauthLogin(oauthUserInfo: {
        oauth_name: string;
        oauth_user_id: string;
        email?: string;
        name?: string;
        avatar?: string;
        raw_data: string;
    }): Promise<UsersResult> {
        try {
            const db = new SavesManage(this.c);
            const bindsManage = new BindsManage(this.c);

            // 使用BindsManage查找OAuth绑定
            const bindResult = await bindsManage.findByOAuthUserId(oauthUserInfo.oauth_name, oauthUserInfo.oauth_user_id);

            let existingUser = null;
            if (bindResult.flag && bindResult.data && bindResult.data.length > 0) {
                const bind = bindResult.data[0];

                // 检查绑定是否启用
                if (bind.is_enabled !== 1) {
                    return {
                        flag: false,
                        text: "OAuth绑定已被禁用"
                    };
                }

                // 查找绑定的用户
                const userResult: DBResult = await db.find({
                    main: "users",
                    keys: {"users_name": bind.binds_user}
                });

                if (userResult.flag && userResult.data.length > 0) {
                    existingUser = userResult.data[0];
                }
            }

            if (existingUser) {
                // 用户已存在，直接登录
                if (!existingUser.is_enabled) {
                    return {
                        flag: false,
                        text: "账户已被禁用"
                    };
                }

                // 生成token
                const token = existingUser.users_name + "_" + Date.now().toString(36);

                // 返回用户信息
                const userInfo: UsersConfig = {
                    users_name: existingUser.users_name,
                    users_mail: existingUser.users_mail,
                    is_enabled: existingUser.is_enabled,
                    total_size: existingUser.total_size,
                    total_used: existingUser.total_used
                };

                return {
                    flag: true,
                    text: "OAuth登录成功",
                    token: token,
                    data: [userInfo]
                };
            } else {
                // 用户不存在，创建新用户
                const username = `oauth_${oauthUserInfo.oauth_name}_${oauthUserInfo.oauth_user_id}`;
                const email = oauthUserInfo.email || `${username}@oauth.local`;

                const newUserConfig: UsersConfig = {
                    users_name: username,
                    users_mail: email,
                    users_pass: await bcrypt.hash(Math.random().toString(36), 10), // 随机密码
                    users_mask: "",
                    is_enabled: true,
                    total_size: 1024 * 1024 * 1024, // 默认1GB存储空间
                    total_used: 0,
                    mount_data: ""
                };

                // 创建用户
                const createResult = await this.config(newUserConfig);
                if (!createResult.flag) {
                    return createResult;
                }

                // 为新用户创建OAuth绑定记录
                const bindsData: BindsData = {
                    oauth_user_id: oauthUserInfo.oauth_user_id,
                    email: oauthUserInfo.email,
                    name: oauthUserInfo.name,
                    avatar: oauthUserInfo.avatar,
                    raw_data: oauthUserInfo.raw_data,
                    created_at: Date.now()
                };

                const bindCreateResult = await bindsManage.create({
                    oauth_name: oauthUserInfo.oauth_name,
                    binds_user: username,
                    binds_data: JSON.stringify(bindsData),
                    is_enabled: 1
                });

                if (!bindCreateResult.flag) {
                    // 如果绑定创建失败，记录错误但不影响登录
                    console.error("创建OAuth绑定记录失败:", bindCreateResult.text);
                }

                // 生成token
                const token = username + "_" + Date.now().toString(36);

                // 返回用户信息
                const userInfo: UsersConfig = {
                    users_name: username,
                    users_mail: email,
                    is_enabled: true,
                    total_size: 1024 * 1024 * 1024,
                    total_used: 0
                };

                return {
                    flag: true,
                    text: "OAuth注册并登录成功",
                    token: token,
                    data: [userInfo]
                };
            }

        } catch (error) {
            console.error("OAuth登录过程中发生错误:", error);
            return {
                flag: false,
                text: "OAuth登录失败，请稍后重试"
            };
        }
    }

    /**
     * 绑定OAuth账户到现有用户
     * @param username - 用户名
     * @param oauthUserInfo - OAuth用户信息
     * @returns 返回操作结果
     */
    async bindOAuth(username: string, oauthUserInfo: {
        oauth_name: string;
        oauth_user_id: string;
        email?: string;
        name?: string;
        avatar?: string;
        raw_data: string;
    }): Promise<UsersResult> {
        try {
            const db = new SavesManage(this.c);
            const bindsManage = new BindsManage(this.c);

            // 查找用户
            const userResult: DBResult = await db.find({
                main: "users",
                keys: {"users_name": username},
            });

            if (userResult.data.length === 0) {
                return {
                    flag: false,
                    text: "用户不存在"
                };
            }

            // 检查是否已存在此OAuth账户的绑定
            const existingBindResult = await bindsManage.findByOAuthUserId(oauthUserInfo.oauth_name, oauthUserInfo.oauth_user_id);
            if (existingBindResult.flag && existingBindResult.data && existingBindResult.data.length > 0) {
                return {
                    flag: false,
                    text: "此OAuth账户已被其他用户绑定"
                };
            }

            // 检查用户是否已绑定此OAuth提供商
            const userBindResult = await bindsManage.select(oauthUserInfo.oauth_name, username);
            if (userBindResult.flag && userBindResult.data && userBindResult.data.length > 0) {
                return {
                    flag: false,
                    text: "您已绑定此OAuth提供商的账户"
                };
            }

            // 准备绑定数据
            const bindsData: BindsData = {
                oauth_user_id: oauthUserInfo.oauth_user_id,
                email: oauthUserInfo.email,
                name: oauthUserInfo.name,
                avatar: oauthUserInfo.avatar,
                raw_data: oauthUserInfo.raw_data,
                created_at: Date.now()
            };

            // 创建绑定记录
            const bindResult = await bindsManage.create({
                oauth_name: oauthUserInfo.oauth_name,
                binds_user: username,
                binds_data: JSON.stringify(bindsData),
                is_enabled: 1
            });

            if (!bindResult.flag) {
                return {
                    flag: false,
                    text: bindResult.text
                };
            }

            return {
                flag: true,
                text: "OAuth账户绑定成功"
            };

        } catch (error) {
            console.error("绑定OAuth账户过程中发生错误:", error);
            return {
                flag: false,
                text: "绑定OAuth账户失败，请稍后重试"
            };
        }
    }

    /**
     * 解绑OAuth账户
     * @param username - 用户名
     * @param oauthName - OAuth提供商名称
     * @param oauthUserId - OAuth用户ID
     * @returns 返回操作结果
     */
    async unbindOAuth(username: string, oauthName: string, oauthUserId: string): Promise<UsersResult> {
        try {
            const db = new SavesManage(this.c);
            const bindsManage = new BindsManage(this.c);

            // 查找用户
            const userResult: DBResult = await db.find({
                main: "users",
                keys: {"users_name": username},
            });

            if (userResult.data.length === 0) {
                return {
                    flag: false,
                    text: "用户不存在"
                };
            }

            // 查找要解绑的OAuth绑定
            const bindResult = await bindsManage.findByOAuthUserId(oauthName, oauthUserId);
            if (!bindResult.flag || !bindResult.data || bindResult.data.length === 0) {
                return {
                    flag: false,
                    text: "未找到要解绑的OAuth账户"
                };
            }

            const bind = bindResult.data[0];

            // 验证绑定是否属于当前用户
            if (bind.binds_user !== username) {
                return {
                    flag: false,
                    text: "无权解绑此OAuth账户"
                };
            }

            // 删除绑定记录
            const removeResult = await bindsManage.remove(oauthName, username);
            if (!removeResult.flag) {
                return {
                    flag: false,
                    text: removeResult.text
                };
            }

            return {
                flag: true,
                text: "OAuth账户解绑成功"
            };

        } catch (error) {
            console.error("解绑OAuth账户过程中发生错误:", error);
            return {
                flag: false,
                text: "解绑OAuth账户失败，请稍后重试"
            };
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