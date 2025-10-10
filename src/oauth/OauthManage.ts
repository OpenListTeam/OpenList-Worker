import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {OauthConfig, OauthResult} from "./OauthObject";

/**
 * 三方认证管理类，用于处理OAuth认证配置的创建、删除、配置和查询操作。
 */
export class OauthManage {
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
     * 创建OAuth认证配置
     * @param oauthData - OAuth认证配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async create(oauthData: OauthConfig): Promise<OauthResult> {
        try {
            // 基本验证
            if (!oauthData.oauth_name || oauthData.oauth_name.length === 0) {
                return {flag: false, text: "认证名称不能为空"};
            }
            if (oauthData.oauth_name.length < 2) {
                return {flag: false, text: "认证名称至少2个字符"};
            }
            if (!oauthData.oauth_type || oauthData.oauth_type.length === 0) {
                return {flag: false, text: "认证类型不能为空"};
            }
            if (!oauthData.oauth_data || oauthData.oauth_data.length === 0) {
                return {flag: false, text: "认证数据不能为空"};
            }

            // 检查OAuth配置是否已经存在
            const find_oauth: DBResult = await this.d.find({
                main: "oauth", 
                keys: {"oauth_name": oauthData.oauth_name}
            });
            if (find_oauth.data.length > 0) {
                return {flag: false, text: "OAuth认证配置已存在"};
            }

            // 验证OAuth数据格式（简单的JSON格式检查）
            try {
                JSON.parse(oauthData.oauth_data);
            } catch (e) {
                return {flag: false, text: "OAuth认证数据格式不正确，必须是有效的JSON"};
            }

            // 创建完整的OAuth配置
            const oauthConfig: OauthConfig = {
                oauth_name: oauthData.oauth_name,
                oauth_type: oauthData.oauth_type,
                oauth_data: oauthData.oauth_data,
                is_enabled: oauthData.is_enabled ?? 1 // 默认启用
            };

            // 添加OAuth配置
            return await this.config(oauthConfig);
        } catch (error) {
            console.error("创建OAuth认证配置过程中发生错误:", error);
            return {
                flag: false,
                text: "创建OAuth认证配置失败，请稍后重试"
            };
        }
    }

    /**
     * 删除OAuth认证配置
     * @param oauth_name - 认证名称
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async remove(oauth_name: string): Promise<OauthResult> {
        try {
            if (!oauth_name || oauth_name.length === 0) {
                return {flag: false, text: "认证名称不能为空"};
            }

            const result: DBResult = await this.d.kill({
                main: "oauth",
                keys: {"oauth_name": oauth_name},
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("删除OAuth认证配置过程中发生错误:", error);
            return {
                flag: false,
                text: "删除OAuth认证配置失败，请稍后重试"
            };
        }
    }

    /**
     * 配置OAuth认证
     * @param oauthData - OAuth认证配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async config(oauthData: OauthConfig): Promise<OauthResult> {
        try {
            const result: DBResult = await this.d.save({
                main: "oauth",
                keys: {"oauth_name": oauthData.oauth_name},
                data: oauthData,
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("配置OAuth认证过程中发生错误:", error);
            return {
                flag: false,
                text: "配置OAuth认证失败，请稍后重试"
            };
        }
    }

    /**
     * 查询OAuth认证配置信息
     * @param oauth_name - 可选参数，指定认证名称。若未提供，则查询所有OAuth配置
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据
     */
    async select(oauth_name?: string): Promise<OauthResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "oauth",
                keys: oauth_name ? {oauth_name: oauth_name} : {},
            });

            let result_data: OauthConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as OauthConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("查询OAuth认证配置过程中发生错误:", error);
            return {
                flag: false,
                text: "查询OAuth认证配置失败，请稍后重试"
            };
        }
    }

    /**
     * 启用或禁用OAuth认证配置
     * @param oauth_name - 认证名称
     * @param is_enabled - 是否启用（1启用，0禁用）
     * @returns 返回操作结果
     */
    async toggleStatus(oauth_name: string, is_enabled: number): Promise<OauthResult> {
        try {
            if (!oauth_name || oauth_name.length === 0) {
                return {flag: false, text: "认证名称不能为空"};
            }

            // 先查询OAuth配置是否存在
            const find_result = await this.select(oauth_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "OAuth认证配置不存在"};
            }

            const oauthData = find_result.data[0];
            oauthData.is_enabled = is_enabled;

            return await this.config(oauthData);
        } catch (error) {
            console.error("切换OAuth认证配置状态过程中发生错误:", error);
            return {
                flag: false,
                text: "切换OAuth认证配置状态失败，请稍后重试"
            };
        }
    }

    /**
     * 更新OAuth认证数据
     * @param oauth_name - 认证名称
     * @param oauth_data - 新的认证数据
     * @returns 返回操作结果
     */
    async updateData(oauth_name: string, oauth_data: string): Promise<OauthResult> {
        try {
            if (!oauth_name || oauth_name.length === 0) {
                return {flag: false, text: "认证名称不能为空"};
            }
            if (!oauth_data || oauth_data.length === 0) {
                return {flag: false, text: "认证数据不能为空"};
            }

            // 验证OAuth数据格式
            try {
                JSON.parse(oauth_data);
            } catch (e) {
                return {flag: false, text: "OAuth认证数据格式不正确，必须是有效的JSON"};
            }

            // 先查询OAuth配置是否存在
            const find_result = await this.select(oauth_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "OAuth认证配置不存在"};
            }

            const oauthData = find_result.data[0];
            oauthData.oauth_data = oauth_data;

            return await this.config(oauthData);
        } catch (error) {
            console.error("更新OAuth认证数据过程中发生错误:", error);
            return {
                flag: false,
                text: "更新OAuth认证数据失败，请稍后重试"
            };
        }
    }

    /**
     * 更新OAuth认证类型
     * @param oauth_name - 认证名称
     * @param oauth_type - 新的认证类型
     * @returns 返回操作结果
     */
    async updateType(oauth_name: string, oauth_type: string): Promise<OauthResult> {
        try {
            if (!oauth_name || oauth_name.length === 0) {
                return {flag: false, text: "认证名称不能为空"};
            }
            if (!oauth_type || oauth_type.length === 0) {
                return {flag: false, text: "认证类型不能为空"};
            }

            // 先查询OAuth配置是否存在
            const find_result = await this.select(oauth_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "OAuth认证配置不存在"};
            }

            const oauthData = find_result.data[0];
            oauthData.oauth_type = oauth_type;

            return await this.config(oauthData);
        } catch (error) {
            console.error("更新OAuth认证类型过程中发生错误:", error);
            return {
                flag: false,
                text: "更新OAuth认证类型失败，请稍后重试"
            };
        }
    }

    /**
     * 获取启用的OAuth认证配置列表
     * @returns 返回所有启用的OAuth认证配置
     */
    async getEnabledOauth(): Promise<OauthResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "oauth",
                keys: {is_enabled: 1},
            });

            let result_data: OauthConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as OauthConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("获取启用OAuth认证配置列表过程中发生错误:", error);
            return {
                flag: false,
                text: "获取启用OAuth认证配置列表失败，请稍后重试"
            };
        }
    }

    /**
     * 根据类型获取OAuth认证配置
     * @param oauth_type - 认证类型
     * @returns 返回指定类型的OAuth认证配置
     */
    async getByType(oauth_type: string): Promise<OauthResult> {
        try {
            if (!oauth_type || oauth_type.length === 0) {
                return {flag: false, text: "认证类型不能为空"};
            }

            const result: DBResult = await this.d.find({
                main: "oauth",
                keys: {oauth_type: oauth_type, is_enabled: 1},
            });

            let result_data: OauthConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as OauthConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("根据类型获取OAuth认证配置过程中发生错误:", error);
            return {
                flag: false,
                text: "根据类型获取OAuth认证配置失败，请稍后重试"
            };
        }
    }

    /**
     * 验证OAuth认证配置
     * @param oauth_name - 认证名称
     * @returns 返回验证结果
     */
    async validateConfig(oauth_name: string): Promise<OauthResult> {
        try {
            if (!oauth_name || oauth_name.length === 0) {
                return {flag: false, text: "认证名称不能为空"};
            }

            const find_result = await this.select(oauth_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "OAuth认证配置不存在"};
            }

            const oauthData = find_result.data[0];
            
            // 检查配置是否启用
            if (oauthData.is_enabled !== 1) {
                return {flag: false, text: "OAuth认证配置已禁用"};
            }

            // 验证OAuth数据格式
            try {
                const parsedData = JSON.parse(oauthData.oauth_data);
                // 这里可以根据oauth_type进行更详细的验证
                if (!parsedData || typeof parsedData !== 'object') {
                    return {flag: false, text: "OAuth认证数据格式无效"};
                }
            } catch (e) {
                return {flag: false, text: "OAuth认证数据不是有效的JSON格式"};
            }

            return {
                flag: true,
                text: "OAuth认证配置验证通过",
                data: [oauthData]
            };
        } catch (error) {
            console.error("验证OAuth认证配置过程中发生错误:", error);
            return {
                flag: false,
                text: "验证OAuth认证配置失败，请稍后重试"
            };
        }
    }
}