import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {CryptInfo} from "./CryptObject";

/**
 * 加密配置管理类，用于处理加密配置的创建、删除、配置和查询操作。
 */
export class CryptManage {
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
     * 创建加密配置
     * @param cryptData - 加密配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async create(cryptData: CryptInfo): Promise<{flag: boolean, text: string}> {
        try {
            // 基本验证
            if (!cryptData.crypt_name || cryptData.crypt_name.length === 0) {
                return {flag: false, text: "加密配置名称不能为空"};
            }
            if (cryptData.crypt_name.length < 1) {
                return {flag: false, text: "加密配置名称至少1个字符"};
            }
            if (!cryptData.crypt_user || cryptData.crypt_user.length === 0) {
                return {flag: false, text: "用户标识不能为空"};
            }
            if (!cryptData.crypt_pass || cryptData.crypt_pass.length === 0) {
                return {flag: false, text: "加密密码不能为空"};
            }

            // 检查加密配置是否已经存在
            const find_crypt: DBResult = await this.d.find({
                main: "crypt", 
                keys: {"crypt_name": cryptData.crypt_name}
            });
            if (find_crypt.data.length > 0) {
                return {flag: false, text: "加密配置已存在"};
            }

            // 创建完整的加密配置
            const cryptConfig: CryptInfo = {
                crypt_name: cryptData.crypt_name,
                crypt_user: cryptData.crypt_user,
                crypt_pass: cryptData.crypt_pass,
                crypt_type: cryptData.crypt_type ?? 1, // 默认AES加密
                crypt_mode: cryptData.crypt_mode ?? 0x03, // 默认文件和文件名都加密
                is_enabled: cryptData.is_enabled ?? true, // 默认启用
                crypt_self: cryptData.crypt_self ?? false, // 默认不存储密码
                rands_pass: cryptData.rands_pass ?? false, // 默认不随机密码
                write_name: cryptData.write_name ?? "", // 默认无后缀
                // write_info: cryptData.write_info ?? "", // 默认无信息
                oauth_data: cryptData.oauth_data ?? {}
            };

            // 添加加密配置
            return await this.config(cryptConfig);
        } catch (error) {
            console.error("创建加密配置过程中发生错误:", error);
            return {
                flag: false,
                text: "创建加密配置失败，请稍后重试"
            };
        }
    }

    /**
     * 删除加密配置
     * @param crypt_name - 加密配置名称
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async remove(crypt_name: string): Promise<{flag: boolean, text: string}> {
        try {
            if (!crypt_name || crypt_name.length === 0) {
                return {flag: false, text: "加密配置名称不能为空"};
            }

            const result: DBResult = await this.d.kill({
                main: "crypt",
                keys: {"crypt_name": crypt_name},
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("删除加密配置过程中发生错误:", error);
            return {
                flag: false,
                text: "删除加密配置失败，请稍后重试"
            };
        }
    }

    /**
     * 配置加密
     * @param cryptData - 加密配置信息
     * @returns 返回操作结果，包含成功标志和描述信息
     */
    async config(cryptData: CryptInfo): Promise<{flag: boolean, text: string}> {
        try {
            const result: DBResult = await this.d.save({
                main: "crypt",
                keys: {"crypt_name": cryptData.crypt_name},
                data: cryptData,
            });
            return {
                flag: result.flag,
                text: result.text,
            };
        } catch (error) {
            console.error("配置加密过程中发生错误:", error);
            return {
                flag: false,
                text: "配置加密失败，请稍后重试"
            };
        }
    }

    /**
     * 查询加密配置信息
     * @param crypt_name - 可选参数，指定加密配置名称。若未提供，则查询所有加密配置
     * @returns 返回操作结果，包含成功标志、描述信息和查询数据
     */
    async select(crypt_name?: string): Promise<{flag: boolean, text: string, data?: CryptInfo[]}> {
        try {
            const result: DBResult = await this.d.find({
                main: "crypt",
                keys: crypt_name ? {crypt_name: crypt_name} : {},
            });

            let result_data: CryptInfo[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as CryptInfo);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("查询加密配置过程中发生错误:", error);
            return {
                flag: false,
                text: "查询加密配置失败，请稍后重试"
            };
        }
    }

    /**
     * 启用或禁用加密配置
     * @param crypt_name - 加密配置名称
     * @param is_enabled - 是否启用
     * @returns 返回操作结果
     */
    async toggleStatus(crypt_name: string, is_enabled: boolean): Promise<{flag: boolean, text: string}> {
        try {
            if (!crypt_name || crypt_name.length === 0) {
                return {flag: false, text: "加密配置名称不能为空"};
            }

            // 先查询加密配置是否存在
            const find_result = await this.select(crypt_name);
            if (!find_result.flag || !find_result.data || find_result.data.length === 0) {
                return {flag: false, text: "加密配置不存在"};
            }

            const cryptData = find_result.data[0];
            cryptData.is_enabled = is_enabled;

            return await this.config(cryptData);
        } catch (error) {
            console.error("切换加密配置状态过程中发生错误:", error);
            return {
                flag: false,
                text: "切换加密配置状态失败，请稍后重试"
            };
        }
    }

    /**
     * 获取启用的加密配置列表
     * @returns 返回所有启用的加密配置
     */
    async getEnabledCrypts(): Promise<{flag: boolean, text: string, data?: CryptInfo[]}> {
        try {
            const result: DBResult = await this.d.find({
                main: "crypt",
                keys: {is_enabled: true},
            });

            let result_data: CryptInfo[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as CryptInfo);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("获取启用加密配置列表过程中发生错误:", error);
            return {
                flag: false,
                text: "获取启用加密配置列表失败，请稍后重试"
            };
        }
    }

    /**
     * 根据用户获取可访问的加密配置
     * @param crypt_user - 用户标识
     * @returns 返回该用户可访问的加密配置
     */
    async getUserCrypts(crypt_user: string): Promise<{flag: boolean, text: string, data?: CryptInfo[]}> {
        try {
            const result: DBResult = await this.d.find({
                main: "crypt",
                keys: {crypt_user: crypt_user, is_enabled: true},
            });

            let result_data: CryptInfo[] = [];
            if (result.data.length > 0) {
                for (const item of result.data) {
                    result_data.push(item as CryptInfo);
                }
            }

            return {
                flag: result.flag,
                text: result.text,
                data: result_data,
            };
        } catch (error) {
            console.error("获取用户加密配置过程中发生错误:", error);
            return {
                flag: false,
                text: "获取用户加密配置失败，请稍后重试"
            };
        }
    }
}