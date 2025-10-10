import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {ShareConfig, ShareResult} from "./ShareObject";
import {v4 as uuidv4} from 'uuid';

/**
 * 分享管理类，用于处理文件分享的创建、删除、配置和查询操作。
 */
export class ShareManage {
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
     * 创建分享
     * @param shareData - 分享配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async create(shareData: ShareConfig): Promise<ShareResult> {
        try {
            // 基本验证
            if (!shareData.share_path || shareData.share_path.length === 0) {
                return {flag: false, text: "分享路径不能为空"};
            }
            if (!shareData.share_user || shareData.share_user.length === 0) {
                return {flag: false, text: "分享用户不能为空"};
            }

            // 生成UUID
            const share_uuid = shareData.share_uuid || uuidv4();

            // 检查分享是否已经存在
            const find_share: DBResult = await this.d.find({
                main: "share", 
                keys: {"share_uuid": share_uuid}
            });
            if (find_share.data.length > 0) {
                return {flag: false, text: "分享已存在"};
            }

            // 验证分享密码长度（如果提供）
            if (shareData.share_pass && shareData.share_pass.length > 0 && shareData.share_pass.length < 4) {
                return {flag: false, text: "分享密码至少4个字符"};
            }

            // 验证日期格式
            if (shareData.share_date && !this.isValidDate(shareData.share_date)) {
                return {flag: false, text: "分享日期格式不正确"};
            }
            if (shareData.share_ends && !this.isValidDate(shareData.share_ends)) {
                return {flag: false, text: "分享结束日期格式不正确"};
            }

            // 验证结束日期是否在开始日期之后
            if (shareData.share_date && shareData.share_ends) {
                const startDate = new Date(shareData.share_date);
                const endDate = new Date(shareData.share_ends);
                if (endDate <= startDate) {
                    return {flag: false, text: "分享结束日期必须在开始日期之后"};
                }
            }

            // 创建完整的分享配置
            const shareConfig: ShareConfig = {
                share_uuid: share_uuid,
                share_path: shareData.share_path,
                share_pass: shareData.share_pass || "",
                share_user: shareData.share_user,
                share_date: shareData.share_date || new Date().toISOString(),
                share_ends: shareData.share_ends || "",
                is_enabled: shareData.is_enabled ?? 1 // 默认启用
            };

            // 添加分享配置
            return await this.config(shareConfig);
        } catch (error) {
            console.error("创建分享过程中发生错误:", error);
            return {
                flag: false,
                text: "创建分享失败，请稍后重试"
            };
        }
    }

    /**
     * 删除分享
     * @param share_uuid - 分享UUID
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async remove(share_uuid: string): Promise<ShareResult> {
        try {
            if (!share_uuid || share_uuid.length === 0) {
                return {flag: false, text: "分享UUID不能为空"};
            }

            const result: DBResult = await this.d.kill({
                main: "share",
                keys: {"share_uuid": share_uuid},
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("删除分享过程中发生错误:", error);
            return {
                flag: false,
                text: "删除分享失败，请稍后重试"
            };
        }
    }

    /**
     * 配置分享
     * @param shareData - 分享配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async config(shareData: ShareConfig): Promise<ShareResult> {
        try {
            const result: DBResult = await this.d.save({
                main: "share",
                keys: {"share_uuid": shareData.share_uuid},
                data: shareData,
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("配置分享过程中发生错误:", error);
            return {
                flag: false,
                text: "配置分享失败，请稍后重试"
            };
        }
    }

    /**
     * 查询分享信息
     * @param share_uuid - 可选参数，指定分享UUID。若未提供，则查询所有分享
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据
     */
    async select(share_uuid?: string): Promise<ShareResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "share",
                keys: share_uuid ? {share_uuid: share_uuid} : {},
            });

            let result_data: ShareConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as ShareConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("查询分享信息过程中发生错误:", error);
            return {
                flag: false,
                text: "查询分享信息失败，请稍后重试"
            };
        }
    }

    /**
     * 启用或禁用分享
     * @param share_uuid - 分享UUID
     * @param is_enabled - 是否启用（1启用，0禁用）
     * @returns 返回操作结果
     */
    async toggleStatus(share_uuid: string, is_enabled: number): Promise<ShareResult> {
        try {
            if (!share_uuid || share_uuid.length === 0) {
                return {flag: false, text: "分享UUID不能为空"};
            }

            // 先查询分享是否存在
            const find_result = await this.select(share_uuid);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "分享不存在"};
            }

            const shareData = find_result.data[0];
            shareData.is_enabled = is_enabled;

            return await this.config(shareData);
        } catch (error) {
            console.error("切换分享状态过程中发生错误:", error);
            return {
                flag: false,
                text: "切换分享状态失败，请稍后重试"
            };
        }
    }

    /**
     * 更新分享密码
     * @param share_uuid - 分享UUID
     * @param share_pass - 新的分享密码
     * @returns 返回操作结果
     */
    async updatePassword(share_uuid: string, share_pass: string): Promise<ShareResult> {
        try {
            if (!share_uuid || share_uuid.length === 0) {
                return {flag: false, text: "分享UUID不能为空"};
            }
            if (share_pass && share_pass.length > 0 && share_pass.length < 4) {
                return {flag: false, text: "分享密码至少4个字符"};
            }

            // 先查询分享是否存在
            const find_result = await this.select(share_uuid);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "分享不存在"};
            }

            const shareData = find_result.data[0];
            shareData.share_pass = share_pass || "";

            return await this.config(shareData);
        } catch (error) {
            console.error("更新分享密码过程中发生错误:", error);
            return {
                flag: false,
                text: "更新分享密码失败，请稍后重试"
            };
        }
    }

    /**
     * 更新分享结束时间
     * @param share_uuid - 分享UUID
     * @param share_ends - 新的结束时间
     * @returns 返回操作结果
     */
    async updateEndTime(share_uuid: string, share_ends: string): Promise<ShareResult> {
        try {
            if (!share_uuid || share_uuid.length === 0) {
                return {flag: false, text: "分享UUID不能为空"};
            }
            if (share_ends && !this.isValidDate(share_ends)) {
                return {flag: false, text: "分享结束日期格式不正确"};
            }

            // 先查询分享是否存在
            const find_result = await this.select(share_uuid);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "分享不存在"};
            }

            const shareData = find_result.data[0];
            
            // 验证结束日期是否在开始日期之后
            if (share_ends && shareData.share_date) {
                const startDate = new Date(shareData.share_date);
                const endDate = new Date(share_ends);
                if (endDate <= startDate) {
                    return {flag: false, text: "分享结束日期必须在开始日期之后"};
                }
            }

            shareData.share_ends = share_ends || "";

            return await this.config(shareData);
        } catch (error) {
            console.error("更新分享结束时间过程中发生错误:", error);
            return {
                flag: false,
                text: "更新分享结束时间失败，请稍后重试"
            };
        }
    }

    /**
     * 根据用户获取分享列表
     * @param share_user - 分享用户
     * @returns 返回用户的分享列表
     */
    async getByUser(share_user: string): Promise<ShareResult> {
        try {
            if (!share_user || share_user.length === 0) {
                return {flag: false, text: "分享用户不能为空"};
            }

            const result: DBResult = await this.d.find({
                main: "share",
                keys: {share_user: share_user},
            });

            let result_data: ShareConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as ShareConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("根据用户获取分享列表过程中发生错误:", error);
            return {
                flag: false,
                text: "根据用户获取分享列表失败，请稍后重试"
            };
        }
    }

    /**
     * 获取启用的分享列表
     * @returns 返回所有启用的分享
     */
    async getEnabledShares(): Promise<ShareResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "share",
                keys: {is_enabled: 1},
            });

            let result_data: ShareConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as ShareConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("获取启用分享列表过程中发生错误:", error);
            return {
                flag: false,
                text: "获取启用分享列表失败，请稍后重试"
            };
        }
    }

    /**
     * 验证分享访问权限
     * @param share_uuid - 分享UUID
     * @param share_pass - 分享密码（可选）
     * @returns 返回验证结果
     */
    async validateAccess(share_uuid: string, share_pass?: string): Promise<ShareResult> {
        try {
            if (!share_uuid || share_uuid.length === 0) {
                return {flag: false, text: "分享UUID不能为空"};
            }

            const find_result = await this.select(share_uuid);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "分享不存在"};
            }

            const shareData = find_result.data[0];
            
            // 检查分享是否启用
            if (shareData.is_enabled !== 1) {
                return {flag: false, text: "分享已禁用"};
            }

            // 检查分享是否过期
            if (shareData.share_ends && shareData.share_ends.length > 0) {
                const endDate = new Date(shareData.share_ends);
                const now = new Date();
                if (now > endDate) {
                    return {flag: false, text: "分享已过期"};
                }
            }

            // 检查密码
            if (shareData.share_pass && shareData.share_pass.length > 0) {
                if (!share_pass || share_pass !== shareData.share_pass) {
                    return {flag: false, text: "分享密码错误"};
                }
            }

            return {
                flag: true,
                text: "分享访问验证通过",
                data: [shareData]
            };
        } catch (error) {
            console.error("验证分享访问权限过程中发生错误:", error);
            return {
                flag: false,
                text: "验证分享访问权限失败，请稍后重试"
            };
        }
    }

    /**
     * 获取即将过期的分享列表
     * @param days - 天数，默认7天
     * @returns 返回即将过期的分享列表
     */
    async getExpiringShares(days: number = 7): Promise<ShareResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "share",
                keys: {is_enabled: 1},
            });

            let result_data: ShareConfig[] = [];
            const now = new Date();
            const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

            if (result.data.length > 0) {
                for (const item of result.data) {
                    const shareData = item as ShareConfig;
                    if (shareData.share_ends && shareData.share_ends.length > 0) {
                        const endDate = new Date(shareData.share_ends);
                        if (endDate > now && endDate <= futureDate) {
                            result_data.push(shareData);
                        }
                    }
                }
            }

            return {
                flag: true,
                text: `找到${result_data.length}个即将过期的分享`,
                data: result_data,
            };
        } catch (error) {
            console.error("获取即将过期分享列表过程中发生错误:", error);
            return {
                flag: false,
                text: "获取即将过期分享列表失败，请稍后重试"
            };
        }
    }

    /**
     * 清理过期分享
     * @returns 返回清理结果
     */
    async cleanExpiredShares(): Promise<ShareResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "share",
                keys: {},
            });

            let cleanedCount = 0;
            const now = new Date();

            if (result.data.length > 0) {
                for (const item of result.data) {
                    const shareData = item as ShareConfig;
                    if (shareData.share_ends && shareData.share_ends.length > 0) {
                        const endDate = new Date(shareData.share_ends);
                        if (now > endDate) {
                            await this.remove(shareData.share_uuid);
                            cleanedCount++;
                        }
                    }
                }
            }

            return {
                flag: true,
                text: `成功清理${cleanedCount}个过期分享`,
            };
        } catch (error) {
            console.error("清理过期分享过程中发生错误:", error);
            return {
                flag: false,
                text: "清理过期分享失败，请稍后重试"
            };
        }
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