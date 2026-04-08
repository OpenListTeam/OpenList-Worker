/**
 * 驱动业务逻辑对齐工具
 * 提供统一的文件对象格式转换、Token 刷新重试机制等
 * 与 GO 后端驱动层行为保持一致
 */
import type { Context } from 'hono';
import { SavesManage } from '../saves/SavesManage';

// ============================================================
// 文件对象格式转换（与 GO 后端 ObjResp 对齐）
// ============================================================

/** GO 后端文件类型枚举（与 utils.GetObjType 对齐） */
export const ObjType = {
    Unknown: 0,
    Folder: 1,
    Video: 2,
    Audio: 3,
    Text: 4,
    Image: 5,
    Archive: 6,
    Doc: 7,
    Code: 4,
} as const;

const VIDEO_EXTS = new Set(['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts', 'rmvb', 'rm', '3gp', 'ogv']);
const AUDIO_EXTS = new Set(['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'wma', 'ape', 'opus', 'alac']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif', 'heic', 'heif', 'avif']);
const TEXT_EXTS = new Set(['txt', 'md', 'log', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg', 'env', 'sh', 'bat', 'ps1', 'js', 'ts', 'py', 'go', 'java', 'c', 'cpp', 'h', 'rs', 'php', 'rb', 'html', 'css', 'scss', 'less', 'vue', 'jsx', 'tsx', 'sql', 'graphql', 'proto']);
const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst', 'lz4', 'lzma', 'cab', 'iso', 'dmg', 'pkg', 'deb', 'rpm']);
const DOC_EXTS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'epub', 'mobi']);

/**
 * 根据文件名推断文件类型
 * 与 GO 后端 utils.GetObjType 对齐
 */
export function getObjType(name: string, isDir: boolean): number {
    if (isDir) return ObjType.Folder;
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (VIDEO_EXTS.has(ext)) return ObjType.Video;
    if (AUDIO_EXTS.has(ext)) return ObjType.Audio;
    if (IMAGE_EXTS.has(ext)) return ObjType.Image;
    if (TEXT_EXTS.has(ext)) return ObjType.Text;
    if (ARCHIVE_EXTS.has(ext)) return ObjType.Archive;
    if (DOC_EXTS.has(ext)) return ObjType.Doc;
    return ObjType.Unknown;
}

/**
 * 将驱动内部文件对象（FileInfo）转换为 GO 后端 ObjResp 格式
 */
export function toGoObjResp(file: any, parentPath: string, sign: string = ''): any {
    const name = file.fileName || file.name || '';
    const isDir = file.fileType === 0 || file.is_dir === true || (typeof name === 'string' && name.endsWith('/'));
    const size = typeof file.fileSize === 'number' ? file.fileSize : (file.size ?? 0);
    const modified = file.timeModify instanceof Date
        ? file.timeModify.toISOString()
        : (file.timeModify || file.modified || new Date().toISOString());
    const created = file.timeCreate instanceof Date
        ? file.timeCreate.toISOString()
        : (file.timeCreate || file.created || modified);

    // 哈希信息
    const hashInfo = file.fileHash || file.hash_info || null;
    const hashInfoStr = hashInfo
        ? Object.entries(hashInfo).map(([k, v]) => `${k.toUpperCase()}:${v}`).join(' ')
        : 'null';

    return {
        name: name.replace(/\/$/, ''), // 去掉目录名末尾的 /
        size,
        is_dir: isDir,
        modified,
        created,
        sign,
        thumb: file.thumbnails || file.thumb || '',
        type: getObjType(name, isDir),
        hashinfo: hashInfoStr,
        hash_info: hashInfo,
    };
}

// ============================================================
// Token 自动刷新与重试机制
// ============================================================

/**
 * 带 Token 刷新的操作执行器
 * 当操作因 Token 过期失败时，自动刷新 Token 并重试
 *
 * @param driver 驱动实例
 * @param operation 要执行的操作函数
 * @param maxRetries 最大重试次数（默认 1）
 */
export async function withTokenRefresh<T>(
    driver: any,
    operation: () => Promise<T>,
    maxRetries: number = 1
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const msg = (error.message || '').toLowerCase();
            const isTokenError = msg.includes('token') ||
                msg.includes('unauthorized') ||
                msg.includes('401') ||
                msg.includes('expired') ||
                msg.includes('invalid_token') ||
                msg.includes('access_denied');

            if (isTokenError && attempt < maxRetries) {
                console.log(`[TokenRefresh] Token 过期，尝试刷新... (attempt ${attempt + 1})`);
                try {
                    // 调用驱动的 Token 刷新方法
                    if (typeof driver.refreshToken === 'function') {
                        await driver.refreshToken();
                    } else if (typeof driver.initSelf === 'function') {
                        await driver.initSelf();
                    }
                    console.log('[TokenRefresh] Token 刷新成功，重试操作');
                    continue;
                } catch (refreshError: any) {
                    console.error('[TokenRefresh] Token 刷新失败:', refreshError.message);
                    throw refreshError;
                }
            }

            throw error;
        }
    }

    throw lastError;
}

// ============================================================
// 代理模式请求转发
// ============================================================

/**
 * 通过代理转发文件请求
 * 当驱动配置了代理模式时使用
 */
export async function proxyFileRequest(
    c: Context,
    url: string,
    headers: Record<string, string> = {},
    fileName: string = 'file'
): Promise<Response> {
    const rangeHeader = c.req.header('Range');
    const fetchHeaders: Record<string, string> = { ...headers };
    if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

    const upstream = await fetch(url, { headers: fetchHeaders });

    const responseHeaders: Record<string, string> = {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
    };

    const contentLength = upstream.headers.get('Content-Length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    const contentRange = upstream.headers.get('Content-Range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
    });
}

// ============================================================
// 驱动初始化失败处理
// ============================================================

/**
 * 安全初始化驱动，失败时记录日志并更新挂载状态
 */
export async function safeInitDriver(
    c: Context,
    mountPath: string,
    driver: any
): Promise<{ success: boolean; message: string }> {
    try {
        const result = await driver.initSelf();
        if (!result.flag) {
            await updateMountStatus(c, mountPath, false, result.text || '初始化失败');
            return { success: false, message: result.text || '初始化失败' };
        }
        await updateMountStatus(c, mountPath, true, 'work');
        return { success: true, message: 'work' };
    } catch (error: any) {
        const msg = error.message || '未知错误';
        console.error(`[Driver Init] ${mountPath} 初始化失败:`, msg);
        await updateMountStatus(c, mountPath, false, msg);
        return { success: false, message: msg };
    }
}

async function updateMountStatus(
    c: Context,
    mountPath: string,
    success: boolean,
    message: string
): Promise<void> {
    try {
        const db = new SavesManage(c);
        await db.save({
            main: 'mount',
            keys: { mount_path: mountPath },
            data: { drive_logs: message },
        });
    } catch (e) {
        console.error('[Driver Init] 更新挂载状态失败:', e);
    }
}

// ============================================================
// 分片上传辅助工具
// ============================================================

/**
 * 将 ArrayBuffer 分割为指定大小的分片
 */
export function splitIntoChunks(buffer: ArrayBuffer, chunkSize: number): ArrayBuffer[] {
    const chunks: ArrayBuffer[] = [];
    let offset = 0;
    while (offset < buffer.byteLength) {
        const end = Math.min(offset + chunkSize, buffer.byteLength);
        chunks.push(buffer.slice(offset, end));
        offset = end;
    }
    return chunks;
}

/**
 * 从 ReadableStream 读取所有数据
 */
export async function readStreamToBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }
    return merged.buffer;
}
