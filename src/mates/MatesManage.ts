import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {MatesConfig, MatesResult} from "./MatesObject";

/**
 * 路径配置管理类，用于处理元组配置的创建、删除、配置和查询操作。
 */
export class MatesManage {
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
     * 创建路径配置
     * @param matesData - 路径配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async create(matesData: MatesConfig): Promise<MatesResult> {
        try {
            // 基本验证
            if (!matesData.mates_name || matesData.mates_name.length === 0) {
                return {flag: false, text: "路径名称不能为空"};
            }
            if (matesData.mates_name.length < 1) {
                return {flag: false, text: "路径名称至少1个字符"};
            }
            if (matesData.mates_mask === undefined || matesData.mates_mask === null) {
                return {flag: false, text: "权限掩码不能为空"};
            }
            if (matesData.mates_user === undefined || matesData.mates_user === null) {
                return {flag: false, text: "所有用户标识不能为空"};
            }

            // 检查路径配置是否已经存在
            const find_mates: DBResult = await this.d.find({
                main: "mates", 
                keys: {"mates_name": matesData.mates_name}
            });
            if (find_mates.data.length > 0) {
                return {flag: false, text: "路径配置已存在"};
            }

            // 创建完整的路径配置
            const matesConfig: MatesConfig = {
                mates_name: matesData.mates_name,
                mates_mask: matesData.mates_mask,
                mates_user: matesData.mates_user,
                is_enabled: matesData.is_enabled ?? 1, // 默认启用
                dir_hidden: matesData.dir_hidden ?? 0, // 默认不隐藏
                dir_shared: matesData.dir_shared ?? 0, // 默认不共享
                set_zipped: matesData.set_zipped ?? "", // 默认无压缩配置
                set_parted: matesData.set_parted ?? "", // 默认无分片配置
                crypt_name: matesData.crypt_name ?? "", // 默认无加密配置
                cache_time: matesData.cache_time ?? 0 // 默认无缓存时间
            };

            // 添加路径配置
            return await this.config(matesConfig);
        } catch (error) {
            console.error("创建路径配置过程中发生错误:", error);
            return {
                flag: false,
                text: "创建路径配置失败，请稍后重试"
            };
        }
    }

    /**
     * 删除路径配置
     * @param mates_name - 路径名称
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async remove(mates_name: string): Promise<MatesResult> {
        try {
            if (!mates_name || mates_name.length === 0) {
                return {flag: false, text: "路径名称不能为空"};
            }

            const result: DBResult = await this.d.kill({
                main: "mates",
                keys: {"mates_name": mates_name},
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("删除路径配置过程中发生错误:", error);
            return {
                flag: false,
                text: "删除路径配置失败，请稍后重试"
            };
        }
    }

    /**
     * 配置路径
     * @param matesData - 路径配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async config(matesData: MatesConfig): Promise<MatesResult> {
        try {
            const result: DBResult = await this.d.save({
                main: "mates",
                keys: {"mates_name": matesData.mates_name},
                data: matesData,
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("配置路径过程中发生错误:", error);
            return {
                flag: false,
                text: "配置路径失败，请稍后重试"
            };
        }
    }

    /**
     * 查询路径配置信息
     * @param mates_name - 可选参数，指定路径名称。若未提供，则查询所有路径配置
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据
     */
    async select(mates_name?: string): Promise<MatesResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "mates",
                keys: mates_name ? {mates_name: mates_name} : {},
            });

            let result_data: MatesConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as MatesConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("查询路径配置过程中发生错误:", error);
            return {
                flag: false,
                text: "查询路径配置失败，请稍后重试"
            };
        }
    }

    /**
     * 启用或禁用路径配置
     * @param mates_name - 路径名称
     * @param is_enabled - 是否启用（1启用，0禁用）
     * @returns 返回操作结果
     */
    async toggleStatus(mates_name: string, is_enabled: number): Promise<MatesResult> {
        try {
            if (!mates_name || mates_name.length === 0) {
                return {flag: false, text: "路径名称不能为空"};
            }

            // 先查询路径配置是否存在
            const find_result = await this.select(mates_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "路径配置不存在"};
            }

            const matesData = find_result.data[0];
            matesData.is_enabled = is_enabled;

            return await this.config(matesData);
        } catch (error) {
            console.error("切换路径配置状态过程中发生错误:", error);
            return {
                flag: false,
                text: "切换路径配置状态失败，请稍后重试"
            };
        }
    }

    /**
     * 更新路径权限掩码
     * @param mates_name - 路径名称
     * @param mates_mask - 新的权限掩码
     * @returns 返回操作结果
     */
    async updateMask(mates_name: string, mates_mask: number): Promise<MatesResult> {
        try {
            if (!mates_name || mates_name.length === 0) {
                return {flag: false, text: "路径名称不能为空"};
            }

            // 先查询路径配置是否存在
            const find_result = await this.select(mates_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "路径配置不存在"};
            }

            const matesData = find_result.data[0];
            matesData.mates_mask = mates_mask;

            return await this.config(matesData);
        } catch (error) {
            console.error("更新路径权限掩码过程中发生错误:", error);
            return {
                flag: false,
                text: "更新路径权限掩码失败，请稍后重试"
            };
        }
    }

    /**
     * 设置路径隐藏状态
     * @param mates_name - 路径名称
     * @param dir_hidden - 是否隐藏（1隐藏，0显示）
     * @returns 返回操作结果
     */
    async setHidden(mates_name: string, dir_hidden: number): Promise<MatesResult> {
        try {
            if (!mates_name || mates_name.length === 0) {
                return {flag: false, text: "路径名称不能为空"};
            }

            // 先查询路径配置是否存在
            const find_result = await this.select(mates_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "路径配置不存在"};
            }

            const matesData = find_result.data[0];
            matesData.dir_hidden = dir_hidden;

            return await this.config(matesData);
        } catch (error) {
            console.error("设置路径隐藏状态过程中发生错误:", error);
            return {
                flag: false,
                text: "设置路径隐藏状态失败，请稍后重试"
            };
        }
    }

    /**
     * 设置路径共享状态
     * @param mates_name - 路径名称
     * @param dir_shared - 是否共享（1共享，0不共享）
     * @returns 返回操作结果
     */
    async setShared(mates_name: string, dir_shared: number): Promise<MatesResult> {
        try {
            if (!mates_name || mates_name.length === 0) {
                return {flag: false, text: "路径名称不能为空"};
            }

            // 先查询路径配置是否存在
            const find_result = await this.select(mates_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "路径配置不存在"};
            }

            const matesData = find_result.data[0];
            matesData.dir_shared = dir_shared;

            return await this.config(matesData);
        } catch (error) {
            console.error("设置路径共享状态过程中发生错误:", error);
            return {
                flag: false,
                text: "设置路径共享状态失败，请稍后重试"
            };
        }
    }

    /**
     * 设置加密配置
     * @param mates_name - 路径名称
     * @param crypt_name - 加密配置名称
     * @returns 返回操作结果
     */
    async setCryptConfig(mates_name: string, crypt_name: string): Promise<MatesResult> {
        try {
            if (!mates_name || mates_name.length === 0) {
                return {flag: false, text: "路径名称不能为空"};
            }

            // 先查询路径配置是否存在
            const find_result = await this.select(mates_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "路径配置不存在"};
            }

            const matesData = find_result.data[0];
            matesData.crypt_name = crypt_name;

            return await this.config(matesData);
        } catch (error) {
            console.error("设置加密配置过程中发生错误:", error);
            return {
                flag: false,
                text: "设置加密配置失败，请稍后重试"
            };
        }
    }

    /**
     * 设置缓存时间
     * @param mates_name - 路径名称
     * @param cache_time - 缓存时间（秒）
     * @returns 返回操作结果
     */
    async setCacheTime(mates_name: string, cache_time: number): Promise<MatesResult> {
        try {
            if (!mates_name || mates_name.length === 0) {
                return {flag: false, text: "路径名称不能为空"};
            }

            // 先查询路径配置是否存在
            const find_result = await this.select(mates_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "路径配置不存在"};
            }

            const matesData = find_result.data[0];
            matesData.cache_time = cache_time;

            return await this.config(matesData);
        } catch (error) {
            console.error("设置缓存时间过程中发生错误:", error);
            return {
                flag: false,
                text: "设置缓存时间失败，请稍后重试"
            };
        }
    }

    /**
     * 获取启用的路径配置列表
     * @returns 返回所有启用的路径配置
     */
    async getEnabledMates(): Promise<MatesResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "mates",
                keys: {is_enabled: 1},
            });

            let result_data: MatesConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as MatesConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("获取启用路径配置列表过程中发生错误:", error);
            return {
                flag: false,
                text: "获取启用路径配置列表失败，请稍后重试"
            };
        }
    }

    /**
     * 根据用户获取可访问的路径配置
     * @param mates_user - 用户标识
     * @returns 返回该用户可访问的路径配置
     */
    async getUserMates(mates_user: number): Promise<MatesResult> {
        try {
            const result: DBResult = await this.d.find({
                main: "mates",
                keys: {mates_user: mates_user, is_enabled: 1},
            });

            let result_data: MatesConfig[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as MatesConfig);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("获取用户路径配置过程中发生错误:", error);
            return {
                flag: false,
                text: "获取用户路径配置失败，请稍后重试"
            };
        }
    }
}