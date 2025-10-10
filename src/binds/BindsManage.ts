import { Context } from "hono";
import { SavesManage } from "../saves/SavesManage";
import { DBResult } from "../saves/SavesObject";
import { BindsConfig, BindsResult, BindsData } from "./BindsObject";

/**
 * OAuth绑定管理类
 * 负责管理用户与OAuth账户的绑定关系
 */
export class BindsManage {
    private c: Context;
    private d: SavesManage;

    constructor(c: Context) {
        this.c = c;
        this.d = new SavesManage(c);
    }

    /**
     * 创建OAuth绑定
     * @param bindsData - OAuth绑定配置信息
     * @returns 返回操作结果
     */
    async create(bindsData: BindsConfig): Promise<BindsResult> {
        try {
            // 基本验证
            if (!bindsData.oauth_name || bindsData.oauth_name.length === 0) {
                return { flag: false, text: "OAuth名称不能为空" };
            }
            if (!bindsData.binds_user || bindsData.binds_user.length === 0) {
                return { flag: false, text: "绑定用户不能为空" };
            }
            if (!bindsData.binds_data || bindsData.binds_data.length === 0) {
                return { flag: false, text: "绑定数据不能为空" };
            }

            // 验证绑定数据格式（必须是有效的JSON）
            try {
                JSON.parse(bindsData.binds_data);
            } catch (e) {
                return { flag: false, text: "绑定数据格式不正确，必须是有效的JSON" };
            }

            // 检查是否已存在相同的绑定
            const existingResult = await this.d.find({
                main: "binds",
                keys: {
                    oauth_name: bindsData.oauth_name,
                    binds_user: bindsData.binds_user
                }
            });

            if (existingResult.data.length > 0) {
                return { flag: false, text: "该用户已绑定此OAuth账户" };
            }

            // 创建绑定配置
            const bindsConfig: BindsConfig = {
                oauth_name: bindsData.oauth_name,
                binds_user: bindsData.binds_user,
                binds_data: bindsData.binds_data,
                is_enabled: bindsData.is_enabled ?? 1 // 默认启用
            };

            // 保存到数据库
            const result: DBResult = await this.d.config({
                main: "binds",
                data: bindsConfig
            });

            if (result.flag) {
                return {
                    flag: true,
                    text: "OAuth绑定创建成功",
                    data: [bindsConfig]
                };
            } else {
                return {
                    flag: false,
                    text: result.text || "OAuth绑定创建失败"
                };
            }

        } catch (error) {
            console.error("创建OAuth绑定过程中发生错误:", error);
            return {
                flag: false,
                text: "创建OAuth绑定失败，请稍后重试"
            };
        }
    }

    /**
     * 查询OAuth绑定
     * @param oauth_name - OAuth名称（可选）
     * @param binds_user - 绑定用户（可选）
     * @returns 返回查询结果
     */
    async select(oauth_name?: string, binds_user?: string): Promise<BindsResult> {
        try {
            const keys: any = {};
            if (oauth_name) keys.oauth_name = oauth_name;
            if (binds_user) keys.binds_user = binds_user;

            const result: DBResult = await this.d.find({
                main: "binds",
                keys: keys
            });

            if (result.flag) {
                return {
                    flag: true,
                    text: "查询OAuth绑定成功",
                    data: result.data as BindsConfig[]
                };
            } else {
                return {
                    flag: false,
                    text: result.text || "查询OAuth绑定失败"
                };
            }

        } catch (error) {
            console.error("查询OAuth绑定过程中发生错误:", error);
            return {
                flag: false,
                text: "查询OAuth绑定失败，请稍后重试"
            };
        }
    }

    /**
     * 更新OAuth绑定状态
     * @param oauth_name - OAuth名称
     * @param binds_user - 绑定用户
     * @param is_enabled - 是否启用
     * @returns 返回操作结果
     */
    async updateStatus(oauth_name: string, binds_user: string, is_enabled: number): Promise<BindsResult> {
        try {
            // 查找现有绑定
            const existingResult = await this.select(oauth_name, binds_user);
            if (!existingResult.flag || !existingResult.data || existingResult.data.length === 0) {
                return { flag: false, text: "OAuth绑定不存在" };
            }

            const existingBind = existingResult.data[0];
            const updatedBind: BindsConfig = {
                ...existingBind,
                is_enabled: is_enabled
            };

            // 更新数据库
            const result: DBResult = await this.d.config({
                main: "binds",
                data: updatedBind
            });

            if (result.flag) {
                return {
                    flag: true,
                    text: "OAuth绑定状态更新成功",
                    data: [updatedBind]
                };
            } else {
                return {
                    flag: false,
                    text: result.text || "OAuth绑定状态更新失败"
                };
            }

        } catch (error) {
            console.error("更新OAuth绑定状态过程中发生错误:", error);
            return {
                flag: false,
                text: "更新OAuth绑定状态失败，请稍后重试"
            };
        }
    }

    /**
     * 删除OAuth绑定
     * @param oauth_name - OAuth名称
     * @param binds_user - 绑定用户
     * @returns 返回操作结果
     */
    async remove(oauth_name: string, binds_user: string): Promise<BindsResult> {
        try {
            // 检查绑定是否存在
            const existingResult = await this.select(oauth_name, binds_user);
            if (!existingResult.flag || !existingResult.data || existingResult.data.length === 0) {
                return { flag: false, text: "OAuth绑定不存在" };
            }

            // 删除绑定
            const result: DBResult = await this.d.remove({
                main: "binds",
                keys: {
                    oauth_name: oauth_name,
                    binds_user: binds_user
                }
            });

            if (result.flag) {
                return {
                    flag: true,
                    text: "OAuth绑定删除成功"
                };
            } else {
                return {
                    flag: false,
                    text: result.text || "OAuth绑定删除失败"
                };
            }

        } catch (error) {
            console.error("删除OAuth绑定过程中发生错误:", error);
            return {
                flag: false,
                text: "删除OAuth绑定失败，请稍后重试"
            };
        }
    }

    /**
     * 根据OAuth用户ID查找绑定
     * @param oauth_name - OAuth名称
     * @param oauth_user_id - OAuth用户ID
     * @returns 返回查询结果
     */
    async findByOAuthUserId(oauth_name: string, oauth_user_id: string): Promise<BindsResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "binds",
                keys: {}
            });

            if (!result.flag) {
                return {
                    flag: false,
                    text: result.text || "查询OAuth绑定失败"
                };
            }

            // 筛选匹配的绑定
            const matchedBinds: BindsConfig[] = [];
            for (const bind of result.data) {
                if (bind.oauth_name === oauth_name) {
                    try {
                        const bindsData: BindsData = JSON.parse(bind.binds_data);
                        if (bindsData.oauth_user_id === oauth_user_id) {
                            matchedBinds.push(bind);
                        }
                    } catch (e) {
                        // 忽略解析错误的数据
                    }
                }
            }

            return {
                flag: true,
                text: "查询OAuth绑定成功",
                data: matchedBinds
            };

        } catch (error) {
            console.error("根据OAuth用户ID查找绑定过程中发生错误:", error);
            return {
                flag: false,
                text: "查询OAuth绑定失败，请稍后重试"
            };
        }
    }
}