/**
 * 压缩解压服务 — 文件压缩和分卷处理
 * 
 * 实现 docs/系统结构设置 中规划的：
 *   - 路径规则中的 "是否压缩文件" 选项
 *   - 路径规则中的 "文件分卷大小" 选项
 *   - 文件系统架构中的 .zip/.f001 分卷后缀
 * 
 * 压缩加密后缀规则：
 *   - 只压缩: file.mp4 → file.mp4.zip
 *   - 压缩+分卷: file.mp4 → file.mp4.f001.zip, file.mp4.f002.zip
 *   - 压缩+加密: file.mp4 → file.mp4.zec (ZEC = ZIP + ENC)
 *   - 完整流程: 加密文件名 → 压缩 → 分卷 → 加密内容
 *     结果: ZmlsZS5tcDQ=.b64.zip.f001.XXXXXX.enc
 */

// ========================================================================
// 压缩配置接口
// ========================================================================
export interface CompressConfig {
    enabled: boolean;       // 是否启用压缩
    method: CompressMethod; // 压缩方法
    level: number;          // 压缩级别(1-9)
    partSize?: number;      // 分卷大小(bytes)，0或undefined为不分卷
    password?: string;      // 压缩密码（可选）
}

export enum CompressMethod {
    DEFLATE = 'deflate',    // 标准Deflate
    GZIP = 'gzip',          // Gzip
    STORE = 'store',        // 仅存储不压缩
}

// ========================================================================
// 分卷信息
// ========================================================================
export interface PartInfo {
    partIndex: number;      // 分卷序号(从1开始)
    partTotal: number;      // 分卷总数
    partSize: number;       // 当前分卷大小
    fileName: string;       // 分卷文件名
}

// ========================================================================
// 压缩服务类
// ========================================================================
export class CompressService {

    /**
     * 判断文件是否为压缩文件
     */
    static isCompressedFile(fileName: string): boolean {
        return /\.(?:zip|gz|zec|tar\.gz|tgz)$/i.test(fileName);
    }

    /**
     * 判断文件是否为分卷文件
     */
    static isPartFile(fileName: string): boolean {
        return /\.f\d{3,}\.(?:zip|gz|zec)$/i.test(fileName);
    }

    /**
     * 解析分卷文件名
     */
    static parsePartFileName(fileName: string): PartInfo | null {
        const match = fileName.match(/\.f(\d{3,})\.(?:zip|gz|zec)$/i);
        if (!match) return null;

        return {
            partIndex: parseInt(match[1], 10),
            partTotal: 0, // 需要扫描所有分卷才能确定
            partSize: 0,
            fileName,
        };
    }

    /**
     * 生成分卷文件名
     */
    static buildPartFileName(
        baseName: string, 
        partIndex: number, 
        extension: string = 'zip'
    ): string {
        const paddedIndex = partIndex.toString().padStart(3, '0');
        return `${baseName}.f${paddedIndex}.${extension}`;
    }

    /**
     * 去除原始文件名
     * 从压缩后的文件名还原原始名
     */
    static stripCompressSuffix(fileName: string): string {
        // 移除分卷+压缩后缀: file.mp4.f001.zip → file.mp4
        let stripped = fileName.replace(/\.f\d{3,}\.(?:zip|gz|zec)$/i, '');
        if (stripped !== fileName) return stripped;

        // 移除压缩后缀: file.mp4.zip → file.mp4
        stripped = fileName.replace(/\.(?:zip|gz|zec)$/i, '');
        return stripped;
    }

    /**
     * 使用 Deflate 压缩数据
     * 利用 Cloudflare Workers 的 CompressionStream API
     */
    static async compress(
        data: ArrayBuffer, 
        method: CompressMethod = CompressMethod.GZIP
    ): Promise<ArrayBuffer> {
        const format = method === CompressMethod.GZIP ? 'gzip' : 'deflate';
        
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array(data));
                controller.close();
            }
        });

        const compressed = stream.pipeThrough(new CompressionStream(format));
        const reader = compressed.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        // 合并所有chunk
        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result.buffer;
    }

    /**
     * 解压数据
     */
    static async decompress(
        data: ArrayBuffer,
        method: CompressMethod = CompressMethod.GZIP
    ): Promise<ArrayBuffer> {
        const format = method === CompressMethod.GZIP ? 'gzip' : 'deflate';
        
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array(data));
                controller.close();
            }
        });

        const decompressed = stream.pipeThrough(new DecompressionStream(format));
        const reader = decompressed.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result.buffer;
    }

    /**
     * 分卷切割数据
     */
    static splitParts(data: ArrayBuffer, partSize: number): ArrayBuffer[] {
        if (partSize <= 0 || data.byteLength <= partSize) {
            return [data];
        }

        const parts: ArrayBuffer[] = [];
        const totalParts = Math.ceil(data.byteLength / partSize);

        for (let i = 0; i < totalParts; i++) {
            const start = i * partSize;
            const end = Math.min(start + partSize, data.byteLength);
            parts.push(data.slice(start, end));
        }

        return parts;
    }

    /**
     * 合并分卷数据
     */
    static mergeParts(parts: ArrayBuffer[]): ArrayBuffer {
        const totalLength = parts.reduce((sum, p) => sum + p.byteLength, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;

        for (const part of parts) {
            result.set(new Uint8Array(part), offset);
            offset += part.byteLength;
        }

        return result.buffer;
    }

    /**
     * 完整压缩流程：压缩 → 分卷
     */
    static async compressAndSplit(
        data: ArrayBuffer,
        config: CompressConfig
    ): Promise<{ parts: ArrayBuffer[]; metadata: any }> {
        // 1. 压缩
        let compressed: ArrayBuffer;
        if (config.method === CompressMethod.STORE) {
            compressed = data;
        } else {
            compressed = await this.compress(data, config.method);
        }

        // 2. 分卷
        const parts = config.partSize 
            ? this.splitParts(compressed, config.partSize)
            : [compressed];

        return {
            parts,
            metadata: {
                originalSize: data.byteLength,
                compressedSize: compressed.byteLength,
                method: config.method,
                partCount: parts.length,
                partSize: config.partSize || compressed.byteLength,
            },
        };
    }

    /**
     * 完整解压流程：合并分卷 → 解压
     */
    static async mergeAndDecompress(
        parts: ArrayBuffer[],
        method: CompressMethod = CompressMethod.GZIP
    ): Promise<ArrayBuffer> {
        // 1. 合并分卷
        const merged = this.mergeParts(parts);

        // 2. 解压
        if (method === CompressMethod.STORE) {
            return merged;
        }
        return await this.decompress(merged, method);
    }
}
