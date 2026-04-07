/**
 * 媒体库管理服务
 * 
 * 功能：
 *   - 递归扫描所有挂载点，按文件扩展名分类
 *   - 支持视频、音频、图片、书籍四种媒体类型
 *   - 支持分页和搜索
 */
import { Context } from 'hono';
import { MountManage } from '../mount/MountManage';
import { FileInfo, FileType } from '../files/FilesObject';

// ========================================================================
// 媒体类型定义
// ========================================================================

export type MediaCategory = 'video' | 'music' | 'image' | 'books';

/** 媒体文件扩展名映射 */
const MEDIA_EXTENSIONS: Record<MediaCategory, string[]> = {
    video: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'm4v', 'rmvb', 'rm', '3gp', 'mpg', 'mpeg', 'vob'],
    music: ['mp3', 'flac', 'wav', 'aac', 'ogg', 'wma', 'ape', 'alac', 'm4a', 'opus', 'aiff', 'dsf', 'dff'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', 'ico', 'heic', 'heif', 'avif', 'raw', 'cr2', 'nef'],
    books: ['pdf', 'epub', 'mobi', 'azw3', 'djvu', 'cbr', 'cbz', 'fb2', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt'],
};

/** FileType 枚举到媒体分类的映射 */
const FILE_TYPE_TO_CATEGORY: Partial<Record<FileType, MediaCategory>> = {
    [FileType.F_VID]: 'video',
    [FileType.F_AUD]: 'music',
    [FileType.F_IMG]: 'image',
    [FileType.F_DOC]: 'books',
};

/** 媒体分类到 FileType 枚举的映射 */
const CATEGORY_TO_FILE_TYPE: Record<MediaCategory, FileType> = {
    video: FileType.F_VID,
    music: FileType.F_AUD,
    image: FileType.F_IMG,
    books: FileType.F_DOC,
};

// ========================================================================
// 媒体文件信息（扩展 FileInfo，增加挂载点路径）
// ========================================================================

export interface MediaFileInfo extends FileInfo {
    /** 文件的完整虚拟路径（挂载点路径 + 相对路径） */
    fullPath: string;
    /** 所属挂载点路径 */
    mountPath: string;
    /** 媒体分类 */
    mediaType: MediaCategory;
}

export interface MediaListResult {
    flag: boolean;
    text: string;
    data?: {
        category: MediaCategory;
        files: MediaFileInfo[];
        total: number;
        page: number;
        pageSize: number;
    };
}

// ========================================================================
// 媒体库管理类
// ========================================================================

export class MediaManage {
    private c: Context;

    constructor(c: Context) {
        this.c = c;
    }

    /**
     * 根据文件扩展名判断媒体分类
     */
    static getMediaCategory(fileName: string): MediaCategory | null {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        for (const [category, extensions] of Object.entries(MEDIA_EXTENSIONS)) {
            if (extensions.includes(ext)) {
                return category as MediaCategory;
            }
        }
        return null;
    }

    /**
     * 判断文件是否属于指定媒体分类
     */
    static isMediaFile(fileName: string, category?: MediaCategory): boolean {
        if (category) {
            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            return MEDIA_EXTENSIONS[category].includes(ext);
        }
        return MediaManage.getMediaCategory(fileName) !== null;
    }

    /**
     * 扫描指定挂载点下的媒体文件
     * 
     * @param mountPath 挂载点路径
     * @param category 媒体分类（可选，不指定则扫描所有类型）
     * @param scanPath 扫描的子路径（默认根目录）
     * @param maxDepth 最大递归深度（防止无限递归）
     */
    private async scanMount(
        mountPath: string,
        category?: MediaCategory,
        scanPath: string = '/',
        maxDepth: number = 3
    ): Promise<MediaFileInfo[]> {
        if (maxDepth <= 0) return [];

        const results: MediaFileInfo[] = [];

        try {
            const mountManage = new MountManage(this.c);
            const fullPath = mountPath === '/'
                ? scanPath
                : (scanPath === '/' ? mountPath : `${mountPath}${scanPath}`);

            const driveLoad = await mountManage.loader(fullPath, true, true);
            if (!driveLoad || !driveLoad[0]) return results;

            const relativePath = fullPath.replace(driveLoad[0].router, '') || '/';
            const pathInfo = await driveLoad[0].listFile({ path: relativePath });

            if (!pathInfo || !pathInfo.fileList) return results;

            for (const file of pathInfo.fileList) {
                if (file.fileType === FileType.F_DIR) {
                    // 递归扫描子目录
                    const subPath = scanPath === '/'
                        ? `/${file.fileName}`
                        : `${scanPath}/${file.fileName}`;
                    const subResults = await this.scanMount(mountPath, category, subPath, maxDepth - 1);
                    results.push(...subResults);
                } else {
                    // 检查是否为目标媒体类型
                    const fileCategory = MediaManage.getMediaCategory(file.fileName);
                    if (fileCategory && (!category || fileCategory === category)) {
                        const fileFullPath = mountPath === '/'
                            ? (scanPath === '/' ? `/${file.fileName}` : `${scanPath}/${file.fileName}`)
                            : (scanPath === '/' ? `${mountPath}/${file.fileName}` : `${mountPath}${scanPath}/${file.fileName}`);

                        results.push({
                            ...file,
                            fullPath: fileFullPath,
                            mountPath: mountPath,
                            mediaType: fileCategory,
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`扫描挂载点 ${mountPath} 失败:`, error);
        }

        return results;
    }

    /**
     * 获取媒体库文件列表
     * 
     * @param category 媒体分类
     * @param page 页码（从1开始）
     * @param pageSize 每页数量
     * @param keyword 搜索关键词（可选）
     * @param mountPath 限定挂载点（可选，不指定则扫描所有挂载点）
     */
    async list(
        category: MediaCategory,
        page: number = 1,
        pageSize: number = 50,
        keyword?: string,
        mountPath?: string,
    ): Promise<MediaListResult> {
        try {
            let allFiles: MediaFileInfo[] = [];

            if (mountPath) {
                // 扫描指定挂载点
                allFiles = await this.scanMount(mountPath, category);
            } else {
                // 扫描所有启用的挂载点
                const mountManage = new MountManage(this.c);
                const mountResult = await mountManage.select();

                if (!mountResult.flag || !mountResult.data) {
                    return { flag: false, text: '获取挂载点列表失败' };
                }

                for (const mount of mountResult.data) {
                    if (!mount.is_enabled) continue;
                    const files = await this.scanMount(mount.mount_path, category);
                    allFiles.push(...files);
                }
            }

            // 关键词过滤
            if (keyword && keyword.trim()) {
                const kw = keyword.trim().toLowerCase();
                allFiles = allFiles.filter(f => f.fileName.toLowerCase().includes(kw));
            }

            // 按修改时间倒序排列（最新的在前）
            allFiles.sort((a, b) => {
                const ta = a.timeModify ? new Date(a.timeModify).getTime() : 0;
                const tb = b.timeModify ? new Date(b.timeModify).getTime() : 0;
                return tb - ta;
            });

            // 分页
            const total = allFiles.length;
            const start = (page - 1) * pageSize;
            const pagedFiles = allFiles.slice(start, start + pageSize);

            return {
                flag: true,
                text: 'Success',
                data: {
                    category,
                    files: pagedFiles,
                    total,
                    page,
                    pageSize,
                },
            };
        } catch (error: any) {
            console.error('媒体库查询失败:', error);
            return { flag: false, text: error.message || '媒体库查询失败' };
        }
    }

    /**
     * 获取媒体库统计信息
     * 返回各分类的文件数量
     */
    async stats(): Promise<{
        flag: boolean;
        text: string;
        data?: Record<MediaCategory, number>;
    }> {
        try {
            const mountManage = new MountManage(this.c);
            const mountResult = await mountManage.select();

            if (!mountResult.flag || !mountResult.data) {
                return { flag: false, text: '获取挂载点列表失败' };
            }

            const counts: Record<MediaCategory, number> = {
                video: 0,
                music: 0,
                image: 0,
                books: 0,
            };

            for (const mount of mountResult.data) {
                if (!mount.is_enabled) continue;
                // 扫描所有类型（不限定分类）
                const files = await this.scanMount(mount.mount_path, undefined, '/', 2);
                for (const file of files) {
                    counts[file.mediaType]++;
                }
            }

            return { flag: true, text: 'Success', data: counts };
        } catch (error: any) {
            console.error('媒体库统计失败:', error);
            return { flag: false, text: error.message || '统计失败' };
        }
    }
}
