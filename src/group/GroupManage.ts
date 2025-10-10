import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {GroupConfig, GroupResult} from "./GroupObject";

/**
 * 用户分组管理类，用于处理用户分组的创建、删除、配置和查询操作。
 */
export class GroupManage {
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
     * 创建用户分组
     * @param groupData - 分组配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async create(groupData: GroupConfig): Promise<GroupResult> {
        try {
            // 基本验证
            if (!groupData.group_name || groupData.group_name.length === 0) {
                return {flag: false, text: "分组名称不能为空"};
            }
            if (groupData.group_name.length < 2) {
                return {flag: false, text: "分组名称至少2个字符"};
            }
            if (!groupData.group_mask || groupData.group_mask.length === 0) {
                return {flag: false, text: "分组权限掩码不能为空"};
            }

            // 检查分组是否已经存在
            const find_group: DBResult = await this.d.find({
                main: "group", 
                keys: {"group_name": groupData.group_name}
            });
            if (find_group.data.length > 0) {
                return {flag: false, text: "分组已存在"};
            }

            // 创建完整的分组配置
            const groupConfig: GroupConfig = {
                group_name: groupData.group_name,
                group_mask: groupData.group_mask,
                is_enabled: groupData.is_enabled ?? 1 // 默认启用
            };

            // 添加分组
            return await this.config(groupConfig);
        } catch (error) {
            console.error("创建用户分组过程中发生错误:", error);
            return {
                flag: false,
                text: "创建用户分组失败，请稍后重试"
            };
        }
    }

    /**
     * 删除用户分组
     * @param group_name - 分组名称
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async remove(group_name: string): Promise<GroupResult> {
        try {
            if (!group_name || group_name.length === 0) {
                return {flag: false, text: "分组名称不能为空"};
            }

            const result: DBResult = await this.d.kill({
                main: "group",
                keys: {"group_name": group_name},
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("删除用户分组过程中发生错误:", error);
            return {
                flag: false,
                text: "删除用户分组失败，请稍后重试"
            };
        }
    }

    /**
     * 配置用户分组
     * @param groupData - 分组配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async config(groupData: GroupConfig): Promise<GroupResult> {
        try {
            const result: DBResult = await this.d.save({
                main: "group",
                keys: {"group_name": groupData.group_name},
                data: groupData,
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("配置用户分组过程中发生错误:", error);
            return {
                flag: false,
                text: "配置用户分组失败，请稍后重试"
            };
        }
    }

    /**
     * 查询用户分组信息
     * @param group_name - 可选参数，指定分组名称。若未提供，则查询所有分组
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据
     */
    async select(group_name?: string): Promise<GroupResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "group",
                keys: group_name ? {group_name: group_name} : {},
            });

            let result_data: GroupConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as GroupConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("查询用户分组过程中发生错误:", error);
            return {
                flag: false,
                text: "查询用户分组失败，请稍后重试"
            };
        }
    }

    /**
     * 启用或禁用分组
     * @param group_name - 分组名称
     * @param is_enabled - 是否启用（1启用，0禁用）
     * @returns 返回操作结果
     */
    async toggleStatus(group_name: string, is_enabled: number): Promise<GroupResult> {
        try {
            if (!group_name || group_name.length === 0) {
                return {flag: false, text: "分组名称不能为空"};
            }

            // 先查询分组是否存在
            const find_result = await this.select(group_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "用户分组不存在"};
            }

            const groupData = find_result.data[0];
            groupData.is_enabled = is_enabled;

            return await this.config(groupData);
        } catch (error) {
            console.error("切换分组状态过程中发生错误:", error);
            return {
                flag: false,
                text: "切换分组状态失败，请稍后重试"
            };
        }
    }

    /**
     * 更新分组权限掩码
     * @param group_name - 分组名称
     * @param group_mask - 新的权限掩码
     * @returns 返回操作结果
     */
    async updateMask(group_name: string, group_mask: string): Promise<GroupResult> {
        try {
            if (!group_name || group_name.length === 0) {
                return {flag: false, text: "分组名称不能为空"};
            }
            if (!group_mask || group_mask.length === 0) {
                return {flag: false, text: "权限掩码不能为空"};
            }

            // 先查询分组是否存在
            const find_result = await this.select(group_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "用户分组不存在"};
            }

            const groupData = find_result.data[0];
            groupData.group_mask = group_mask;

            return await this.config(groupData);
        } catch (error) {
            console.error("更新分组权限掩码过程中发生错误:", error);
            return {
                flag: false,
                text: "更新分组权限掩码失败，请稍后重试"
            };
        }
    }

    /**
     * 获取启用的分组列表
     * @returns 返回所有启用的分组
     */
    async getEnabledGroups(): Promise<GroupResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "group",
                keys: {is_enabled: 1},
            });

            let result_data: GroupConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as GroupConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("获取启用分组列表过程中发生错误:", error);
            return {
                flag: false,
                text: "获取启用分组列表失败，请稍后重试"
            };
        }
    }

    /**
     * 检查分组权限
     * @param group_name - 分组名称
     * @param permission - 需要检查的权限
     * @returns 返回权限检查结果
     */
    async checkPermission(group_name: string, permission: string): Promise<GroupResult> {
        try {
            const find_result = await this.select(group_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "用户分组不存在"};
            }

            const groupData = find_result.data[0];
            if (groupData.is_enabled !== 1) {
                return {flag: false, text: "用户分组已禁用"};
            }

            // 这里可以根据实际需求实现权限检查逻辑
            // 例如检查group_mask中是否包含指定权限
            const hasPermission = groupData.group_mask.includes(permission);

            return {
                flag: hasPermission,
                text: hasPermission ? "权限检查通过" : "权限不足",
                data: [groupData]
            };
        } catch (error) {
            console.error("检查分组权限过程中发生错误:", error);
            return {
                flag: false,
                text: "检查分组权限失败，请稍后重试"
            };
        }
    }
}