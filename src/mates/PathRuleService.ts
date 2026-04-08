/**
 * 路径规则服务 — 目录信息配置功能
 * 
 * 实现 docs/系统结构设置 中规划的路径规则功能：
 *   - 基于路径的加密/解密配置（关联加密组）
 *   - 基于路径的压缩/分卷配置
 *   - 基于路径的权限掩码（16位FileMask）
 *   - 基于路径的隐藏/分享控制
 *   - 基于路径的缓存时间配置
 * 
 * 与 MatesManage (CRUD层) 配合使用：
 *   MatesManage 负责数据库 CRUD
 *   PathRuleService 负责业务逻辑（规则匹配、继承、冲突处理）
 */
import { CryptEngine, CryptGroupConfig, CryptMode } from '../crypt/CryptEngine';
import { CompressService, CompressConfig, CompressMethod } from '../unzip/CompressService';

// ========================================================================
// 文件权限掩码 — 16位 (参考 docs/文件架构设计)
// ========================================================================
// 格式: 0000 0000 0000 0000
//   [15-12] 类属性: 加密文件,加密名称,压缩文件,保留
//   [11-8]  所有者: 允许下载,允许写入,允许删除,保留
//   [7-4]   用户组: 允许下载,允许写入,允许删除,保留
//   [3-0]   其他人: 允许下载,允许写入,允许删除,保留
// ========================================================================

export enum FileMaskBit {
    // 类属性 (bits 15-12)
    ATTR_ENCRYPTED = 0x8000,    // 加密文件
    ATTR_NAME_ENC = 0x4000,     // 加密名称
    ATTR_COMPRESSED = 0x2000,   // 压缩文件
    ATTR_RESERVED = 0x1000,     // 保留

    // 所有者权限 (bits 11-8)
    OWNER_DOWNLOAD = 0x0800,    // 允许下载
    OWNER_WRITE = 0x0400,       // 允许写入
    OWNER_DELETE = 0x0200,      // 允许删除
    OWNER_RESERVED = 0x0100,    // 保留

    // 用户组权限 (bits 7-4)
    GROUP_DOWNLOAD = 0x0080,    // 允许下载
    GROUP_WRITE = 0x0040,       // 允许写入
    GROUP_DELETE = 0x0020,      // 允许删除
    GROUP_RESERVED = 0x0010,    // 保留

    // 其他人权限 (bits 3-0)
    OTHER_DOWNLOAD = 0x0008,    // 允许下载
    OTHER_WRITE = 0x0004,       // 允许写入
    OTHER_DELETE = 0x0002,      // 允许删除
    OTHER_RESERVED = 0x0001,    // 保留
}

// 预设权限模板
export const FileMaskPresets = {
    // 完全公开（所有人可下载）
    PUBLIC_READ: FileMaskBit.OWNER_DOWNLOAD | FileMaskBit.OWNER_WRITE | FileMaskBit.OWNER_DELETE
        | FileMaskBit.GROUP_DOWNLOAD | FileMaskBit.OTHER_DOWNLOAD,
    
    // 所有者完全控制，其他人只读
    OWNER_FULL: FileMaskBit.OWNER_DOWNLOAD | FileMaskBit.OWNER_WRITE | FileMaskBit.OWNER_DELETE
        | FileMaskBit.GROUP_DOWNLOAD | FileMaskBit.OTHER_DOWNLOAD,
    
    // 仅所有者
    PRIVATE: FileMaskBit.OWNER_DOWNLOAD | FileMaskBit.OWNER_WRITE | FileMaskBit.OWNER_DELETE,
    
    // 加密+所有者完全控制
    ENCRYPTED_PRIVATE: FileMaskBit.ATTR_ENCRYPTED | FileMaskBit.OWNER_DOWNLOAD 
        | FileMaskBit.OWNER_WRITE | FileMaskBit.OWNER_DELETE,
};

// ========================================================================
// 路径规则配置（增强版）
// ========================================================================
export interface PathRule {
    mates_name: string;     // 路径名(如/path1/)
    mates_mask: number;     // 16位权限掩码
    mates_user: number;     // 所有者用户ID
    is_enabled: number;     // 是否启用
    dir_hidden: number;     // 是否隐藏目录
    dir_shared: number;     // 是否允许分享
    set_zipped: CompressConfig | null;   // 压缩配置
    set_parted: { partSize: number } | null; // 分卷配置
    crypt_name: string;     // 关联的加密组名称
    cache_time: number;     // 缓存时间(秒)
}

// ========================================================================
// 路径规则服务
// ========================================================================
export class PathRuleService {

    /**
     * 路径匹配 — 找到最匹配的路径规则
     * 
     * 匹配规则：
     * 1. 精确匹配优先（/path/file.mp4 > /path/）
     * 2. 最长前缀匹配（/path/sub/ > /path/）
     * 3. 如果没有匹配，返回null（使用默认权限）
     */
    static matchRule(filePath: string, rules: PathRule[]): PathRule | null {
        if (!rules || rules.length === 0) return null;

        // 标准化路径
        const normalizedPath = filePath.replace(/\/+$/, '') || '/';

        let bestMatch: PathRule | null = null;
        let bestMatchLength = 0;

        for (const rule of rules) {
            if (!rule.is_enabled) continue;

            const rulePath = rule.mates_name.replace(/\/+$/, '') || '/';

            // 精确匹配
            if (normalizedPath === rulePath) {
                return rule;
            }

            // 前缀匹配（规则路径以/结尾时表示目录规则）
            if (normalizedPath.startsWith(rulePath + '/') || rulePath === '/') {
                if (rulePath.length > bestMatchLength) {
                    bestMatchLength = rulePath.length;
                    bestMatch = rule;
                }
            }
        }

        return bestMatch;
    }

    /**
     * 检查文件权限
     */
    static checkPermission(
        mask: number,
        action: 'download' | 'write' | 'delete',
        role: 'owner' | 'group' | 'other'
    ): boolean {
        let bit: number;

        switch (role) {
            case 'owner':
                switch (action) {
                    case 'download': bit = FileMaskBit.OWNER_DOWNLOAD; break;
                    case 'write': bit = FileMaskBit.OWNER_WRITE; break;
                    case 'delete': bit = FileMaskBit.OWNER_DELETE; break;
                }
                break;
            case 'group':
                switch (action) {
                    case 'download': bit = FileMaskBit.GROUP_DOWNLOAD; break;
                    case 'write': bit = FileMaskBit.GROUP_WRITE; break;
                    case 'delete': bit = FileMaskBit.GROUP_DELETE; break;
                }
                break;
            case 'other':
                switch (action) {
                    case 'download': bit = FileMaskBit.OTHER_DOWNLOAD; break;
                    case 'write': bit = FileMaskBit.OTHER_WRITE; break;
                    case 'delete': bit = FileMaskBit.OTHER_DELETE; break;
                }
                break;
        }

        return !!(mask & bit);
    }

    /**
     * 检查路径是否需要加密
     */
    static isEncrypted(rule: PathRule | null): boolean {
        if (!rule) return false;
        return !!(rule.mates_mask & FileMaskBit.ATTR_ENCRYPTED) 
            || (rule.crypt_name !== '' && rule.crypt_name !== null);
    }

    /**
     * 检查路径是否需要压缩
     */
    static isCompressed(rule: PathRule | null): boolean {
        if (!rule) return false;
        return !!(rule.mates_mask & FileMaskBit.ATTR_COMPRESSED)
            || (rule.set_zipped !== null && rule.set_zipped !== undefined);
    }

    /**
     * 验证新规则路径不与已有规则重叠
     * 根据 docs/文件系统架构: "路径加密每一个路径不能重叠"
     */
    static validateNoOverlap(newPath: string, existingRules: PathRule[]): {
        valid: boolean;
        conflict?: string;
    } {
        const normalizedNew = newPath.replace(/\/+$/, '') || '/';

        for (const rule of existingRules) {
            const existing = rule.mates_name.replace(/\/+$/, '') || '/';

            // 检查完全相同
            if (normalizedNew === existing) {
                return { valid: false, conflict: `路径 "${newPath}" 与已有规则 "${rule.mates_name}" 完全重复` };
            }

            // 检查嵌套：新路径是已有路径的子路径
            if (normalizedNew.startsWith(existing + '/')) {
                return { valid: false, conflict: `路径 "${newPath}" 是已有规则 "${rule.mates_name}" 的子路径` };
            }

            // 检查嵌套：已有路径是新路径的子路径
            if (existing.startsWith(normalizedNew + '/')) {
                return { valid: false, conflict: `已有规则 "${rule.mates_name}" 是新路径 "${newPath}" 的子路径` };
            }
        }

        return { valid: true };
    }

    /**
     * 解析权限掩码为可读格式
     */
    static parseMask(mask: number): {
        attributes: { encrypted: boolean; nameEncrypted: boolean; compressed: boolean };
        owner: { download: boolean; write: boolean; delete: boolean };
        group: { download: boolean; write: boolean; delete: boolean };
        other: { download: boolean; write: boolean; delete: boolean };
    } {
        return {
            attributes: {
                encrypted: !!(mask & FileMaskBit.ATTR_ENCRYPTED),
                nameEncrypted: !!(mask & FileMaskBit.ATTR_NAME_ENC),
                compressed: !!(mask & FileMaskBit.ATTR_COMPRESSED),
            },
            owner: {
                download: !!(mask & FileMaskBit.OWNER_DOWNLOAD),
                write: !!(mask & FileMaskBit.OWNER_WRITE),
                delete: !!(mask & FileMaskBit.OWNER_DELETE),
            },
            group: {
                download: !!(mask & FileMaskBit.GROUP_DOWNLOAD),
                write: !!(mask & FileMaskBit.GROUP_WRITE),
                delete: !!(mask & FileMaskBit.GROUP_DELETE),
            },
            other: {
                download: !!(mask & FileMaskBit.OTHER_DOWNLOAD),
                write: !!(mask & FileMaskBit.OTHER_WRITE),
                delete: !!(mask & FileMaskBit.OTHER_DELETE),
            },
        };
    }

    /**
     * 检查路径是否被隐藏
     * 根据路径规则的 dir_hidden 标记判断
     */
    static isHidden(rule: PathRule | null): boolean {
        if (!rule) return false;
        return rule.dir_hidden === 1;
    }

    /**
     * 过滤文件列表 — 根据路径规则移除隐藏文件/文件夹
     * 
     * @param fileList 原始文件列表
     * @param basePath 当前目录路径
     * @param rules 所有启用的路径规则
     * @param userRole 用户角色 ('owner' | 'group' | 'other')
     * @returns 过滤后的文件列表
     */
    static filterFileList(
        fileList: any[],
        basePath: string,
        rules: PathRule[],
        userRole: 'owner' | 'group' | 'other' = 'other'
    ): any[] {
        if (!fileList || fileList.length === 0) return fileList;
        if (!rules || rules.length === 0) return fileList;

        return fileList.filter(file => {
            // 构建文件的完整路径
            const filePath = basePath === '/'
                ? `/${file.fileName}`
                : `${basePath}/${file.fileName}`;

            // 查找匹配的路径规则
            const rule = PathRuleService.matchRule(filePath, rules);

            // 如果有规则且标记为隐藏，则过滤掉（管理员/所有者除外）
            if (rule && PathRuleService.isHidden(rule)) {
                // 所有者可以看到隐藏文件
                if (userRole === 'owner') return true;
                return false;
            }

            // 检查下载权限（如果没有下载权限，也不显示）
            if (rule && !PathRuleService.checkPermission(rule.mates_mask, 'download', userRole)) {
                return false;
            }

            return true;
        });
    }

    /**
     * 获取文件的加密信息
     * 如果路径规则指定了加密配置，返回加密配置名称
     */
    static getCryptConfig(filePath: string, rules: PathRule[]): string | null {
        const rule = PathRuleService.matchRule(filePath, rules);
        if (!rule) return null;
        if (rule.crypt_name && rule.crypt_name.length > 0) {
            return rule.crypt_name;
        }
        if (rule.mates_mask & FileMaskBit.ATTR_ENCRYPTED) {
            return rule.crypt_name || null;
        }
        return null;
    }

    /**
     * 获取路径的缓存时间
     */
    static getCacheTime(filePath: string, rules: PathRule[]): number {
        const rule = PathRuleService.matchRule(filePath, rules);
        if (!rule) return 0;
        return rule.cache_time || 0;
    }

    /**
     * 构建权限掩码
     */
    static buildMask(config: {
        encrypted?: boolean;
        nameEncrypted?: boolean;
        compressed?: boolean;
        ownerDownload?: boolean;
        ownerWrite?: boolean;
        ownerDelete?: boolean;
        groupDownload?: boolean;
        groupWrite?: boolean;
        groupDelete?: boolean;
        otherDownload?: boolean;
        otherWrite?: boolean;
        otherDelete?: boolean;
    }): number {
        let mask = 0;
        if (config.encrypted) mask |= FileMaskBit.ATTR_ENCRYPTED;
        if (config.nameEncrypted) mask |= FileMaskBit.ATTR_NAME_ENC;
        if (config.compressed) mask |= FileMaskBit.ATTR_COMPRESSED;
        if (config.ownerDownload) mask |= FileMaskBit.OWNER_DOWNLOAD;
        if (config.ownerWrite) mask |= FileMaskBit.OWNER_WRITE;
        if (config.ownerDelete) mask |= FileMaskBit.OWNER_DELETE;
        if (config.groupDownload) mask |= FileMaskBit.GROUP_DOWNLOAD;
        if (config.groupWrite) mask |= FileMaskBit.GROUP_WRITE;
        if (config.groupDelete) mask |= FileMaskBit.GROUP_DELETE;
        if (config.otherDownload) mask |= FileMaskBit.OTHER_DOWNLOAD;
        if (config.otherWrite) mask |= FileMaskBit.OTHER_WRITE;
        if (config.otherDelete) mask |= FileMaskBit.OTHER_DELETE;
        return mask;
    }
}
