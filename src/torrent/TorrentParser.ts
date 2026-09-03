/**
 * Torrent / 磁力链解析器
 * 
 * 支持：
 *   - .torrent 文件解析（Bencode）
 *   - 磁力链解析
 *   - 返回文件名、大小、文件树
 */
export interface TorrentFileEntry {
    path: string;
    length: number;
}

export interface TorrentMeta {
    name: string;
    size: number;
    files: TorrentFileEntry[];
    info_hash?: string;
    piece_length?: number;
}

export class TorrentParser {
    /**
     * 解析 .torrent 文件的原始字节
     */
    static parseBytes(data: Uint8Array): TorrentMeta {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(data);

        if (text.startsWith('d')) {
            return this.parseBencode(data);
        }

        throw new Error('无效的 .torrent 文件格式');
    }

    /**
     * 解析磁力链
     * magnet:?xt=urn:btih:<hash>&dn=<name>
     */
    static parseMagnet(uri: string): { info_hash: string; name?: string } {
        const url = new URL(uri);
        if (url.protocol !== 'magnet:') {
            throw new Error('不是有效的磁力链接');
        }

        const xt = url.searchParams.get('xt');
        if (!xt) throw new Error('磁力链缺少 info_hash');

        const match = xt.match(/urn:btih:([a-fA-F0-9]{40}|[a-fA-F0-9]{32})/);
        if (!match) throw new Error('磁力链 info_hash 格式无效');

        return {
            info_hash: match[1].toLowerCase(),
            name: url.searchParams.get('dn') || undefined,
        };
    }

    /**
     * 简易 Bencode 解析器
     * 支持: integers (i...e), strings (len:...), lists (l...e), dicts (d...e)
     */
    private static parseBencode(data: Uint8Array): TorrentMeta {
        const decoder = new TextDecoder('utf-8');
        let pos = 0;

        function readByte(): number {
            return data[pos++];
        }

        function peekByte(): number {
            return data[pos];
        }

        function readString(): string {
            let lenStr = '';
            while (peekByte() >= 0x30 && peekByte() <= 0x39) {
                lenStr += String.fromCharCode(readByte());
            }
            if (readByte() !== 0x3a) throw new Error('Bencode 格式错误: 缺少 :');
            const len = parseInt(lenStr, 10);
            const bytes = data.slice(pos, pos + len);
            pos += len;
            return decoder.decode(bytes);
        }

        function readInteger(): number {
            if (readByte() !== 0x69) throw new Error('Bencode 格式错误: 缺少 i');
            let numStr = '';
            if (peekByte() === 0x2d) { numStr += '-'; readByte(); }
            while (peekByte() >= 0x30 && peekByte() <= 0x39) {
                numStr += String.fromCharCode(readByte());
            }
            if (readByte() !== 0x65) throw new Error('Bencode 格式错误: 缺少 e');
            return parseInt(numStr, 10);
        }

        function readList(): any[] {
            if (readByte() !== 0x6c) throw new Error('Bencode: 缺少 l');
            const list: any[] = [];
            while (peekByte() !== 0x65) {
                list.push(readValue());
            }
            readByte(); // consume 'e'
            return list;
        }

        function readDict(): Record<string, any> {
            if (readByte() !== 0x64) throw new Error('Bencode: 缺少 d');
            const dict: Record<string, any> = {};
            while (peekByte() !== 0x65) {
                const key = readString();
                dict[key] = readValue();
            }
            readByte(); // consume 'e'
            return dict;
        }

        function readValue(): any {
            const b = peekByte();
            if (b === 0x69) return readInteger();
            if (b === 0x6c) return readList();
            if (b === 0x64) return readDict();
            if (b >= 0x30 && b <= 0x39) {
                // 对于二进制字符串（如 pieces），保留原始字节
                let lenStr = '';
                while (peekByte() >= 0x30 && peekByte() <= 0x39) {
                    lenStr += String.fromCharCode(readByte());
                }
                readByte(); // ':'
                const len = parseInt(lenStr, 10);
                const bytes = data.slice(pos, pos + len);
                pos += len;
                return bytes;
            }
            throw new Error(`Bencode: 意外字符 ${String.fromCharCode(b)}`);
        }

        const root = readDict();
        const info = root.info;

        if (!info || typeof info !== 'object') {
            throw new Error('Torrent 文件缺少 info 字典');
        }

        let name = '';
        let size = 0;
        const files: TorrentFileEntry[] = [];

        if (info.files) {
            // 多文件模式
            name = decoder.decode(info.name);
            for (const file of info.files) {
                const pathParts = file.path.map((p: Uint8Array) => decoder.decode(p));
                const filePath = pathParts.join('/');
                const fileLen = file.length;
                files.push({ path: `${name}/${filePath}`, length: fileLen });
                size += fileLen;
            }
        } else if (info.length !== undefined) {
            // 单文件模式
            name = decoder.decode(info.name);
            size = info.length;
            files.push({ path: name, length: size });
        }

        // 计算 info_hash (简化：不实际计算 SHA1，返回标记)
        const pieceLength = info['piece length'];

        return {
            name,
            size,
            files,
            info_hash: 'pending_calc',
            piece_length: pieceLength,
        };
    }
}
