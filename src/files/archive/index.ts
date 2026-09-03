/**
 * 归档模块入口
 * 
 * 对齐 Go 后端 internal/archive 的功能：
 *   - 解析 ZIP 归档（ZipProvider）
 *   - rar/7z/iso 在 Workers 环境返回 501 占位
 */

export { ZipProvider } from './ZipProvider';
export type { ArchiveEntry, ArchiveMeta } from './ZipProvider';

import { ZipProvider, type ArchiveEntry, type ArchiveMeta } from './ZipProvider';

// ============================================================
// ArchiveProvider 接口（对齐 Go 端接口体系）
// ============================================================

export interface ArchiveProvider {
    /** 获取归档元信息 */
    meta(data: Uint8Array): Promise<ArchiveMeta>;
    /** 列出条目 */
    list(data: Uint8Array, subPath?: string): Promise<ArchiveEntry[]>;
    /** 提取条目（返回解压数据） */
    extract(data: Uint8Array, entryPath: string, fetcher?: (offset: number, length: number) => Promise<Uint8Array>): Promise<Uint8Array>;
}

// ============================================================
// 归档格式检测
// ============================================================

const EXTENSION_MAP: Record<string, 'zip' | 'rar' | 'sevenzip' | 'tar' | 'gzip' | 'iso' | 'unknown'> = {
    '.zip': 'zip',
    '.rar': 'rar',
    '.7z': 'sevenzip',
    '.tar': 'tar',
    '.gz': 'gzip',
    '.tgz': 'gzip',
    '.iso': 'iso',
};

/** Workers 环境下支持的格式 */
const WORKERS_SUPPORTED = new Set(['zip', 'tar', 'gzip']);

export function detectFormat(filename: string): string {
    const lower = filename.toLowerCase();
    for (const [ext, format] of Object.entries(EXTENSION_MAP)) {
        if (lower.endsWith(ext)) return format;
    }
    return 'unknown';
}

export function isSupportedInWorkers(filename: string): boolean {
    return WORKERS_SUPPORTED.has(detectFormat(filename));
}

// ============================================================
// ArchiveManager（路由层调用入口）
// ============================================================

export class ArchiveManager {
    /**
     * 获取归档元信息
     */
    static async getMeta(data: Uint8Array, filename: string): Promise<{ format: string; supported: boolean; meta?: ArchiveMeta; entries?: ArchiveEntry[] }> {
        const format = detectFormat(filename);
        if (!WORKERS_SUPPORTED.has(format)) {
            return { format, supported: false };
        }

        if (format === 'zip') {
            const zip = new ZipProvider();
            await zip.init(data);
            return {
                format,
                supported: true,
                meta: zip.getMeta(),
                entries: zip.listAll(),
            };
        }

        return { format, supported: false };
    }

    /**
     * 列出归档内指定路径条目
     */
    static async listEntries(data: Uint8Array, filename: string, subPath?: string): Promise<{ supported: boolean; entries?: ArchiveEntry[]; error?: string }> {
        const format = detectFormat(filename);
        if (!WORKERS_SUPPORTED.has(format)) {
            return { supported: false, error: `不支持的归档格式: ${format}。Cloudflare Workers 环境仅支持 ZIP/TAR/GZ。` };
        }

        if (format === 'zip') {
            const zip = new ZipProvider();
            await zip.init(data);
            const entries = subPath ? zip.listDir(subPath) : zip.listAll();
            return { supported: true, entries };
        }

        return { supported: false, error: `格式 ${format} 暂未实现` };
    }

    /**
     * 提取归档中的指定文件
     */
    static async extractFile(
        data: Uint8Array,
        filename: string,
        entryPath: string,
    ): Promise<{ supported: boolean; data?: Uint8Array; error?: string }> {
        const format = detectFormat(filename);
        if (!WORKERS_SUPPORTED.has(format)) {
            return { supported: false, error: `不支持的归档格式: ${format}` };
        }

        if (format === 'zip') {
            const zip = new ZipProvider();
            await zip.init(data);
            const entry = zip.findEntry(entryPath);
            if (!entry) {
                return { supported: true, error: '条目不存在' };
            }
            if (entry.is_dir) {
                return { supported: true, error: '无法提取目录' };
            }

            const extracted = await zip.extractFile(entry, async (offset, length) => {
                // 在内存读取模式下，从原始 data 中切片
                // 需要定位 local header 中的数据起始位置
                const lfhOffset = offset;
                const localFileNameLen = (data[lfhOffset + 26]) | (data[lfhOffset + 27] << 8);
                const localExtraLen = (data[lfhOffset + 28]) | (data[lfhOffset + 29] << 8);
                const dataStart = lfhOffset + 30 + localFileNameLen + localExtraLen;
                return data.slice(dataStart, dataStart + length);
            });

            return { supported: true, data: extracted };
        }

        return { supported: false, error: `格式 ${format} 暂未实现` };
    }
}
