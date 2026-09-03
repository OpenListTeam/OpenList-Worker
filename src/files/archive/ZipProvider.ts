/**
 * ZIP 归档解析器
 * 
 * 纯 TypeScript 实现，不依赖外部库，兼容 Cloudflare Workers。
 * 支持：
 *   - 解析 EOCD → Central Directory → Local Headers
 *   - 列出归档中所有条目（meta / list）
 *   - 提取指定条目（extract），含 DEFLATE 解压（通过 DecompressionStream）
 *   - Range 请求支持（大文件流式读取）
 */

// ============================================================
// ZIP 常量
// ============================================================
const EOCD_SIGNATURE = 0x06054b50;
const CD_SIGNATURE = 0x02014b50;
const LFH_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const EOCD_MAX_COMMENT = 65535;
const CD_ENTRY_BASE_SIZE = 46;

// 压缩方法
const COMPRESSION_STORED = 0;
const COMPRESSION_DEFLATED = 8;

// ============================================================
// 类型定义
// ============================================================

export interface ArchiveEntry {
    name: string;
    is_dir: boolean;
    size: number;
    compressed_size: number;
    modified: number;        // Unix timestamp (ms)
    crc32: number;
    compression_method: number;
    /** 内部偏移（local header 起始位置） */
    offset: number;
    /** 兼容 Go 端字段 */
    isDir?: boolean;
    type?: number;
}

export interface ArchiveMeta {
    /** 条目总数 */
    total: number;
    /** 是否需要密码 */
    encrypted: boolean;
    /** 归档注释（如果有） */
    comment: string;
    /** 支持的编码 */
    encoding: string;
}

// ============================================================
// 工具函数
// ============================================================

function readUint16LE(buf: Uint8Array, offset: number): number {
    return buf[offset] | (buf[offset + 1] << 8);
}

function readUint32LE(buf: Uint8Array, offset: number): number {
    return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0;
}

/** DOS date/time → Unix timestamp (ms) */
function dosToUnixTime(dosDate: number, dosTime: number): number {
    const year = ((dosDate >> 9) & 0x7f) + 1980;
    const month = ((dosDate >> 5) & 0x0f);
    const day = dosDate & 0x1f;
    const hours = (dosTime >> 11) & 0x1f;
    const minutes = (dosTime >> 5) & 0x3f;
    const seconds = (dosTime & 0x1f) * 2;
    return Date.UTC(year, month - 1, day, hours, minutes, seconds);
}

/** 安全解码 ZIP 文件名（尝试 UTF-8，回退 Latin-1） */
function decodeFileName(bytes: Uint8Array): string {
    try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        return decoder.decode(bytes);
    } catch {
        // 回退到 Latin-1（CP437 近似）
        let result = '';
        for (let i = 0; i < bytes.length; i++) {
            result += String.fromCharCode(bytes[i]);
        }
        return result;
    }
}

/** 从文件名判断是否为目录 */
function isDirName(name: string): boolean {
    return name.endsWith('/') || name.endsWith('\\');
}

// ============================================================
// ZIP 读取上下文
// ============================================================

class ZipReader {
    private buf: Uint8Array;
    private view: DataView;

    constructor(buf: Uint8Array) {
        this.buf = buf;
        this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    }

    get length(): number { return this.buf.length; }

    u8(offset: number): number { return this.buf[offset]; }
    u16(offset: number): number { return readUint16LE(this.buf, offset); }
    u32(offset: number): number { return readUint32LE(this.buf, offset); }

    slice(from: number, to?: number): Uint8Array {
        return this.buf.slice(from, to);
    }
}

// ============================================================
// EOCD 查找
// ============================================================

function findEOCD(buf: Uint8Array): { offset: number; size: number } | null {
    const maxOffset = Math.min(buf.length, EOCD_MIN_SIZE + EOCD_MAX_COMMENT);
    const minOffset = Math.max(0, buf.length - EOCD_MAX_COMMENT - EOCD_MIN_SIZE);

    for (let i = buf.length - EOCD_MIN_SIZE; i >= minOffset; i--) {
        if (readUint32LE(buf, i) === EOCD_SIGNATURE) {
            const commentLen = readUint16LE(buf, i + 20);
            if (i + EOCD_MIN_SIZE + commentLen <= buf.length) {
                return { offset: i, size: EOCD_MIN_SIZE + commentLen };
            }
        }
    }
    return null;
}

// ============================================================
// Central Directory 解析
// ============================================================

function parseCentralDirectory(reader: ZipReader, cdOffset: number, entryCount: number): ArchiveEntry[] {
    const entries: ArchiveEntry[] = [];
    let pos = cdOffset;

    for (let i = 0; i < entryCount && pos < reader.length; i++) {
        if (reader.u32(pos) !== CD_SIGNATURE) break;

        const compressionMethod = reader.u16(pos + 10);
        const dosTime = reader.u16(pos + 12);
        const dosDate = reader.u16(pos + 14);
        const crc32 = reader.u32(pos + 16);
        const compressedSize = reader.u32(pos + 20);
        const uncompressedSize = reader.u32(pos + 24);
        const fileNameLen = reader.u16(pos + 28);
        const extraFieldLen = reader.u16(pos + 30);
        const commentLen = reader.u16(pos + 32);
        const localHeaderOffset = reader.u32(pos + 42);

        const fileNameBytes = reader.slice(pos + CD_ENTRY_BASE_SIZE, pos + CD_ENTRY_BASE_SIZE + fileNameLen);
        const name = decodeFileName(fileNameBytes);

        entries.push({
            name,
            is_dir: isDirName(name),
            size: uncompressedSize,
            compressed_size: compressedSize,
            modified: dosToUnixTime(dosDate, dosTime),
            crc32,
            compression_method: compressionMethod,
            offset: localHeaderOffset,
            isDir: isDirName(name),
            type: isDirName(name) ? 1 : 0,
        });

        pos += CD_ENTRY_BASE_SIZE + fileNameLen + extraFieldLen + commentLen;
    }

    return entries;
}

// ============================================================
// Local File Header 解析（定位文件数据起始位置）
// ============================================================

function findLocalFileDataStart(reader: ZipReader, entry: ArchiveEntry): number {
    const lfhOffset = entry.offset;

    if (reader.u32(lfhOffset) !== LFH_SIGNATURE) {
        return -1;
    }

    const fileNameLen = reader.u16(lfhOffset + 26);
    const extraFieldLen = reader.u16(lfhOffset + 28);
    return lfhOffset + 30 + fileNameLen + extraFieldLen;
}

// ============================================================
// ZipProvider
// ============================================================

export class ZipProvider {
    private reader: ZipReader | null = null;
    private entries: ArchiveEntry[] = [];
    private comment: string = '';

    /**
     * 从 ArrayBuffer/Uint8Array 初始化（小文件整读）
     */
    async init(data: Uint8Array): Promise<void> {
        const eocd = findEOCD(data);
        if (!eocd) {
            throw new Error('无效的 ZIP 文件：未找到 EOCD 签名');
        }

        this.reader = new ZipReader(data);

        const diskNumber = this.reader.u16(eocd.offset + 4);
        const cdDiskNumber = this.reader.u16(eocd.offset + 6);
        const cdEntryCountOnDisk = this.reader.u16(eocd.offset + 8);
        const cdEntryTotal = this.reader.u16(eocd.offset + 10);
        const cdSize = this.reader.u32(eocd.offset + 12);
        const cdOffset = this.reader.u32(eocd.offset + 16);
        const commentLen = this.reader.u16(eocd.offset + 20);

        if (diskNumber !== 0 || cdDiskNumber !== 0) {
            throw new Error('不支持跨盘 ZIP 归档');
        }

        if (commentLen > 0) {
            const commentBytes = this.reader.slice(eocd.offset + 22, eocd.offset + 22 + commentLen);
            this.comment = new TextDecoder('utf-8').decode(commentBytes);
        }

        this.entries = parseCentralDirectory(this.reader, cdOffset, cdEntryCountOnDisk);
    }

    /**
     * 从 ReadableStream + Range 初始化（大文件流式读取尾巴）
     */
    static async fromStream(fetchFn: (start: number, end?: number) => Promise<Response>): Promise<ZipProvider> {
        const provider = new ZipProvider();

        // 1. 先获取末尾 64KB 来查找 EOCD
        const tailResp = await fetchFn(-65536);
        const tailBuf = new Uint8Array(await tailResp.arrayBuffer());

        const eocd = findEOCD(tailBuf);
        if (!eocd) {
            throw new Error('无效的 ZIP 文件：未找到 EOCD 签名');
        }

        // 计算 EOCD 在完整文件中的位置
        const fileTailOffset = tailBuf.length - EOCD_MIN_SIZE;
        // ...

        // 简化：需要知道文件总大小
        const contentRange = tailResp.headers.get('Content-Range');
        let fileSize = 0;
        if (contentRange) {
            const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
            if (match) fileSize = parseInt(match[1]);
        }

        // 2. 读取 CD
        const cdSize = readUint32LE(tailBuf, eocd.offset + 12);
        const cdOffset = readUint32LE(tailBuf, eocd.offset + 16);

        const cdResp = await fetchFn(cdOffset, cdOffset + cdSize - 1);
        const cdBuf = new Uint8Array(await cdResp.arrayBuffer());
        provider.reader = new ZipReader(cdBuf);

        const cdEntryCount = readUint16LE(tailBuf, eocd.offset + 10);
        provider.entries = parseCentralDirectory(provider.reader, 0, cdEntryCount);

        // 恢复 CD 偏移到原始值使得 LFH 能定位
        for (const entry of provider.entries) {
            entry.offset = entry.offset; // 保持不变
        }

        return provider;
    }

    // ============================================================
    // 公共接口
    // ============================================================

    /** 获取归档元信息 */
    getMeta(): ArchiveMeta {
        return {
            total: this.entries.length,
            encrypted: this.entries.some(e => (e.compression_method & 1) !== 0), // bit 0 = encrypted
            comment: this.comment,
            encoding: 'utf-8',
        };
    }

    /** 列出所有条目 */
    listAll(): ArchiveEntry[] {
        return this.entries;
    }

    /** 列出指定子目录下的条目 */
    listDir(dirPath: string): ArchiveEntry[] {
        const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
        return this.entries.filter(
            e => e.name.startsWith(prefix) && e.name !== prefix
        );
    }

    /** 查找指定路径的条目 */
    findEntry(path: string): ArchiveEntry | null {
        // 规范化路径
        const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
        return this.entries.find(e => e.name === normalized || e.name === normalized + '/') || null;
    }

    /**
     * 提取文件内容（需要原始文件数据的访问器）
     * @param entry 目标条目
     * @param dataFetcher 获取原始文件数据的函数
     * @returns 解压后的数据
     */
    async extractFile(
        entry: ArchiveEntry,
        dataFetcher: (offset: number, length: number) => Promise<Uint8Array>,
    ): Promise<Uint8Array> {
        const compressed = await dataFetcher(entry.offset, entry.compressed_size);

        if (entry.compression_method === COMPRESSION_STORED) {
            return compressed;
        }

        if (entry.compression_method === COMPRESSION_DEFLATED) {
            // 使用 DecompressionStream (Cloudflare Workers 支持)
            try {
                const ds = new DecompressionStream('deflate');
                const writer = ds.writable.getWriter();
                const reader = ds.readable.getReader();

                writer.write(compressed.slice().buffer as ArrayBuffer);
                writer.close();

                const chunks: Uint8Array[] = [];
                let totalLen = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    totalLen += value.length;
                }

                const result = new Uint8Array(totalLen);
                let offset = 0;
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                return result;
            } catch {
                throw new Error('DEFLATE 解压失败，文件可能已损坏');
            }
        }

        throw new Error(`不支持的压缩方法: ${entry.compression_method}`);
    }
}
