import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {TokenConfig, TokenResult} from "./TokenObject";
import {v4 as uuidv4} from 'uuid';
import * as crypto from 'crypto';

/**
 * 外部连接管理类，用于处理外部连接令牌的创建、删除、配置和查询操作。
 */
export class TokenManage {
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
     * 创建外部连接令牌
     * @param tokenData - 令牌配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async create(tokenData: TokenConfig): Promise<TokenResult> {
        try {
            // 基本验证
            if (!tokenData.token_name || tokenData.token_name.length === 0) {
                return {flag: false, text: "令牌名称不能为空"};
            }
            if (tokenData.token_name.length < 2) {
                return {flag: false, text: "令牌名称至少2个字符"};
            }
            if (!tokenData.token_user || tokenData.token_user.length === 0) {
                return {flag: false, text: "令牌用户不能为空"};
            }

            // 生成UUID和令牌
            const token_uuid = tokenData.token_uuid || uuidv4();
            const token_data = tokenData.token_data || this.generateToken();

            // 检查令牌名称是否已经存在
            const find_token: DBResult = await this.d.find({
                main: "token", 
                keys: {"token_name": tokenData.token_name, "token_user": tokenData.token_user}
            });
            if (find_token.data.length > 0) {
                return {flag: false, text: "令牌名称已存在"};
            }

            // 验证过期时间格式
            if (tokenData.token_ends && !this.isValidDate(tokenData.token_ends)) {
                return {flag: false, text: "令牌过期时间格式不正确"};
            }

            // 验证过期时间是否在未来
            if (tokenData.token_ends) {
                const endDate = new Date(tokenData.token_ends);
                const now = new Date();
                if (endDate <= now) {
                    return {flag: false, text: "令牌过期时间必须在未来"};
                }
            }

            // 创建完整的令牌配置
            const tokenConfig: TokenConfig = {
                token_uuid: token_uuid,
                token_name: tokenData.token_name,
                token_data: token_data,
                token_user: tokenData.token_user,
                token_ends: tokenData.token_ends || "",
                is_enabled: tokenData.is_enabled ?? 1 // 默认启用
            };

            // 添加令牌配置
            return await this.config(tokenConfig);
        } catch (error) {
            console.error("创建外部连接令牌过程中发生错误:", error);
            return {
                flag: false,
                text: "创建外部连接令牌失败，请稍后重试"
            };
        }
    }

    /**
     * 删除外部连接令牌
     * @param token_uuid - 令牌UUID
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async remove(token_uuid: string): Promise<TokenResult> {
        try {
            if (!token_uuid || token_uuid.length === 0) {
                return {flag: false, text: "令牌UUID不能为空"};
            }

            const result: DBResult = await this.d.kill({
                main: "token",
                keys: {"token_uuid": token_uuid},
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("删除外部连接令牌过程中发生错误:", error);
            return {
                flag: false,
                text: "删除外部连接令牌失败，请稍后重试"
            };
        }
    }

    /**
     * 配置外部连接令牌
     * @param tokenData - 令牌配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async config(tokenData: TokenConfig): Promise<TokenResult> {
        try {
            const result: DBResult = await this.d.save({
                main: "token",
                keys: {"token_uuid": tokenData.token_uuid},
                data: tokenData,
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("配置外部连接令牌过程中发生错误:", error);
            return {
                flag: false,
                text: "配置外部连接令牌失败，请稍后重试"
            };
        }
    }

    /**
     * 查询外部连接令牌信息
     * @param token_uuid - 可选参数，指定令牌UUID。若未提供，则查询所有令牌
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据
     */
    async select(token_uuid?: string): Promise<TokenResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "token",
                keys: token_uuid ? {token_uuid: token_uuid} : {},
            });

            let result_data: TokenConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as TokenConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("查询外部连接令牌信息过程中发生错误:", error);
            return {
                flag: false,
                text: "查询外部连接令牌信息失败，请稍后重试"
            };
        }
    }

    /**
     * 启用或禁用外部连接令牌
     * @param token_uuid - 令牌UUID
     * @param is_enabled - 是否启用（1启用，0禁用）
     * @returns 返回操作结果
     */
    async toggleStatus(token_uuid: string, is_enabled: number): Promise<TokenResult> {
        try {
            if (!token_uuid || token_uuid.length === 0) {
                return {flag: false, text: "令牌UUID不能为空"};
            }

            // 先查询令牌是否存在
            const find_result = await this.select(token_uuid);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "令牌不存在"};
            }

            const tokenData = find_result.data[0];
            tokenData.is_enabled = is_enabled;

            return await this.config(tokenData);
        } catch (error) {
            console.error("切换令牌状态过程中发生错误:", error);
            return {
                flag: false,
                text: "切换令牌状态失败，请稍后重试"
            };
        }
    }

    /**
     * 更新令牌过期时间
     * @param token_uuid - 令牌UUID
     * @param token_ends - 新的过期时间
     * @returns 返回操作结果
     */
    async updateEndTime(token_uuid: string, token_ends: string): Promise<TokenResult> {
        try {
            if (!token_uuid || token_uuid.length === 0) {
                return {flag: false, text: "令牌UUID不能为空"};
            }
            if (token_ends && !this.isValidDate(token_ends)) {
                return {flag: false, text: "令牌过期时间格式不正确"};
            }

            // 验证过期时间是否在未来
            if (token_ends) {
                const endDate = new Date(token_ends);
                const now = new Date();
                if (endDate <= now) {
                    return {flag: false, text: "令牌过期时间必须在未来"};
                }
            }

            // 先查询令牌是否存在
            const find_result = await this.select(token_uuid);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "令牌不存在"};
            }

            const tokenData = find_result.data[0];
            tokenData.token_ends = token_ends || "";

            return await this.config(tokenData);
        } catch (error) {
            console.error("更新令牌过期时间过程中发生错误:", error);
            return {
                flag: false,
                text: "更新令牌过期时间失败，请稍后重试"
            };
        }
    }

    /**
     * 重新生成令牌
     * @param token_uuid - 令牌UUID
     * @returns 返回操作结果
     */
    async regenerateToken(token_uuid: string): Promise<TokenResult> {
        try {
            if (!token_uuid || token_uuid.length === 0) {
                return {flag: false, text: "令牌UUID不能为空"};
            }

            // 先查询令牌是否存在
            const find_result = await this.select(token_uuid);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "令牌不存在"};
            }

            const tokenData = find_result.data[0];
            tokenData.token_data = this.generateToken();

            return await this.config(tokenData);
        } catch (error) {
            console.error("重新生成令牌过程中发生错误:", error);
            return {
                flag: false,
                text: "重新生成令牌失败，请稍后重试"
            };
        }
    }

    /**
     * 根据用户获取令牌列表
     * @param token_user - 令牌用户
     * @returns 返回用户的令牌列表
     */
    async getByUser(token_user: string): Promise<TokenResult> {
        try {
            if (!token_user || token_user.length === 0) {
                return {flag: false, text: "令牌用户不能为空"};
            }

            const result: DBResult = await this.d.find({
                main: "token",
                keys: {token_user: token_user},
            });

            let result_data: TokenConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as TokenConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("根据用户获取令牌列表过程中发生错误:", error);
            return {
                flag: false,
                text: "根据用户获取令牌列表失败，请稍后重试"
            };
        }
    }

    /**
     * 获取启用的令牌列表
     * @returns 返回所有启用的令牌
     */
    async getEnabledTokens(): Promise<TokenResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "token",
                keys: {is_enabled: 1},
            });

            let result_data: TokenConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as TokenConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("获取启用令牌列表过程中发生错误:", error);
            return {
                flag: false,
                text: "获取启用令牌列表失败，请稍后重试"
            };
        }
    }

    /**
     * 验证令牌
     * @param token_data - 令牌数据
     * @returns 返回验证结果
     */
    async validateToken(token_data: string): Promise<TokenResult> {
        try {
            if (!token_data || token_data.length === 0) {
                return {flag: false, text: "令牌数据不能为空"};
            }

            const result: DBResult = await this.d.find({
                main: "token",
                keys: {token_data: token_data, is_enabled: 1},
            });

            if (result.data.length === 0) {
                return {flag: false, text: "令牌无效或已禁用"};
            }

            const tokenData = result.data[0] as TokenConfig;
            
            // 检查令牌是否过期
            if (tokenData.token_ends && tokenData.token_ends.length > 0) {
                const endDate = new Date(tokenData.token_ends);
                const now = new Date();
                if (now > endDate) {
                    return {flag: false, text: "令牌已过期"};
                }
            }

            return {
                flag: true,
                text: "令牌验证通过",
                data: [tokenData]
            };
        } catch (error) {
            console.error("验证令牌过程中发生错误:", error);
            return {
                flag: false,
                text: "验证令牌失败，请稍后重试"
            };
        }
    }

    /**
     * 根据令牌名称查询
     * @param token_name - 令牌名称
     * @param token_user - 令牌用户
     * @returns 返回查询结果
     */
    async getByName(token_name: string, token_user: string): Promise<TokenResult> {
        try {
            if (!token_name || token_name.length === 0) {
                return {flag: false, text: "令牌名称不能为空"};
            }
            if (!token_user || token_user.length === 0) {
                return {flag: false, text: "令牌用户不能为空"};
            }

            const result: DBResult = await this.d.find({
                main: "token",
                keys: {token_name: token_name, token_user: token_user},
            });

            let result_data: TokenConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as TokenConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("根据令牌名称查询过程中发生错误:", error);
            return {
                flag: false,
                text: "根据令牌名称查询失败，请稍后重试"
            };
        }
    }

    /**
     * 获取即将过期的令牌列表
     * @param days - 天数，默认7天
     * @returns 返回即将过期的令牌列表
     */
    async getExpiringTokens(days: number = 7): Promise<TokenResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "token",
                keys: {is_enabled: 1},
            });

            let result_data: TokenConfig[] = [];
            const now = new Date();
            const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

            if (result.data.length > 0) {
                for (const item of result.data) {
                    const tokenData = item as TokenConfig;
                    if (tokenData.token_ends && tokenData.token_ends.length > 0) {
                        const endDate = new Date(tokenData.token_ends);
                        if (endDate > now && endDate <= futureDate) {
                            result_data.push(tokenData);
                        }
                    }
                }
            }

            return {
                flag: true,
                text: `找到${result_data.length}个即将过期的令牌`,
                data: result_data,
            };
        } catch (error) {
            console.error("获取即将过期令牌列表过程中发生错误:", error);
            return {
                flag: false,
                text: "获取即将过期令牌列表失败，请稍后重试"
            };
        }
    }

    /**
     * 清理过期令牌
     * @returns 返回清理结果
     */
    async cleanExpiredTokens(): Promise<TokenResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "token",
                keys: {},
            });

            let cleanedCount = 0;
            const now = new Date();

            if (result.data.length > 0) {
                for (const item of result.data) {
                    const tokenData = item as TokenConfig;
                    if (tokenData.token_ends && tokenData.token_ends.length > 0) {
                        const endDate = new Date(tokenData.token_ends);
                        if (now > endDate) {
                            await this.remove(tokenData.token_uuid);
                            cleanedCount++;
                        }
                    }
                }
            }

            return {
                flag: true,
                text: `成功清理${cleanedCount}个过期令牌`,
            };
        } catch (error) {
            console.error("清理过期令牌过程中发生错误:", error);
            return {
                flag: false,
                text: "清理过期令牌失败，请稍后重试"
            };
        }
    }

    /**
     * 生成随机令牌
     * @returns 返回生成的令牌字符串
     */
    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * 验证日期格式
     * @param dateString - 日期字符串
     * @returns 是否为有效日期
     */
    private isValidDate(dateString: string): boolean {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }
}