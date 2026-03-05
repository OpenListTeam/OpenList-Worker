/**
 * 加密引擎 — 核心加解密服务
 * 
 * 实现 docs/加密流程设计 中规划的：
 *   - 类型路由模块：根据crypt_type路由到不同的加密算法
 *   - 加解密模块：基于流的加解密处理
 *   - 临时密钥组模块：前端传入的临时解密参数
 * 
 * 支持的加密类型(crypt_type)：
 *   0 = BASE64（仅文件名）
 *   1 = AES-256-CTR
 *   2 = XOR-32
 *   3 = ChaCha20
 * 
 * 加密模式(crypt_mode 4位编码)：
 *   bit0 = 加密内容
 *   bit1 = 加密文件名
 *   bit2 = 自我解密(CRC32做密钥)
 *   bit3 = 随机密钥
 */

// ========================================================================
// 加密类型枚举
// ========================================================================
export enum CryptType {
    BASE64 = 0,    // Base64编码（仅文件名）
    AES256 = 1,    // AES-256-CTR加密
    XOR32 = 2,     // XOR-32流加密
    CHACHA20 = 3,  // ChaCha20流加密
}

// ========================================================================
// 加密模式位掩码
// ========================================================================
export enum CryptMode {
    ENCRYPT_CONTENT = 0b0001,   // 加密文件内容
    ENCRYPT_NAME = 0b0010,      // 加密文件名
    SELF_DECRYPT = 0b0100,      // 自我解密（CRC32做密钥）
    RANDOM_KEY = 0b1000,        // 随机密钥
}

// ========================================================================
// 加密组配置接口
// ========================================================================
export interface CryptGroupConfig {
    crypt_name: string;     // 加密组名称
    crypt_pass: string;     // 主密码
    crypt_type: CryptType;  // 加密类型
    crypt_mode: number;     // 加密模式(4位)
    is_enabled: boolean;    // 是否启用
    crypt_self: boolean;    // 自我解密
    rands_pass: boolean;    // 随机密钥
    write_name: string;     // 后缀名称(enc/zec等)
}

// ========================================================================
// 加密识别后缀格式
// ========================================================================
// 格式: AABCDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
//   AA = 版本标识
//   BC = 加密类型编码(4位)
//   D...D = CRC32校验/密钥(32位)
// 最终文件名: file.mp4.XXXXXX.enc 或 AAAAAAAAA.XXXXXX.enc
// ========================================================================

/**
 * 加密后缀信息
 */
export interface CryptSuffix {
    code: string;          // 4位加密编码(AABC)
    crc32: string;         // CRC32部分
    extension: string;     // 文件扩展名(enc/zec/zip)
}

// ========================================================================
// 加密引擎类
// ========================================================================
export class CryptEngine {

    /**
     * 解析加密后缀
     * 从文件名中解析加密识别信息
     */
    static parseSuffix(fileName: string): CryptSuffix | null {
        // 匹配: name.XXXXXX.enc 或 name.XXXXXX.zec
        const encMatch = fileName.match(/\.([A-Za-z0-9]{6,})\.(?:enc|zec)$/);
        if (encMatch) {
            const suffixPart = encMatch[1];
            if (suffixPart.length >= 6) {
                return {
                    code: suffixPart.substring(0, 4),
                    crc32: suffixPart.substring(4),
                    extension: fileName.endsWith('.enc') ? 'enc' : 'zec',
                };
            }
        }

        // 匹配仅有.enc后缀的文件
        if (fileName.endsWith('.enc') || fileName.endsWith('.zec')) {
            return {
                code: '0000',
                crc32: '',
                extension: fileName.endsWith('.enc') ? 'enc' : 'zec',
            };
        }

        return null;
    }

    /**
     * 从加密编码解析加密类型
     */
    static parseCode(code: string): {
        algorithm: CryptType;
        encryptContent: boolean;
        encryptName: boolean;
        crc32AsKey: boolean;
    } {
        const codeNum = parseInt(code, 2) || parseInt(code, 16) || 0;
        
        // 参考 docs/加密流程设计 的识别格式表
        const bit3 = (codeNum >> 3) & 1;
        const bit2 = (codeNum >> 2) & 1;
        const bit1 = (codeNum >> 1) & 1;
        const bit0 = codeNum & 1;

        // 根据高位确定算法
        let algorithm: CryptType;
        if (codeNum <= 0b0000) {
            algorithm = CryptType.BASE64;
        } else if (codeNum <= 0b0011) {
            algorithm = CryptType.AES256;
        } else if (codeNum <= 0b1001) {
            algorithm = CryptType.XOR32;
        } else {
            algorithm = CryptType.CHACHA20;
        }

        return {
            algorithm,
            encryptContent: !!(bit0 || bit1),
            encryptName: !!(bit1),
            crc32AsKey: bit3 === 1,
        };
    }

    /**
     * 生成加密后缀
     */
    static buildSuffix(config: CryptGroupConfig, crc32?: string): string {
        const code = this.buildCode(config);
        const crcPart = crc32 || '';
        const ext = config.write_name || 'enc';
        
        if (crcPart) {
            return `.${code}${crcPart}.${ext}`;
        }
        return `.${ext}`;
    }

    /**
     * 生成4位加密编码
     */
    static buildCode(config: CryptGroupConfig): string {
        let code = 0;
        
        // 根据加密模式设置位
        if (config.crypt_mode & CryptMode.ENCRYPT_CONTENT) code |= 0b0001;
        if (config.crypt_mode & CryptMode.ENCRYPT_NAME) code |= 0b0010;
        if (config.crypt_mode & CryptMode.SELF_DECRYPT) code |= 0b0100;
        if (config.crypt_mode & CryptMode.RANDOM_KEY) code |= 0b1000;
        
        return code.toString(16).padStart(4, '0');
    }

    /**
     * 去除文件名中的加密后缀，还原原始文件名
     */
    static stripSuffix(fileName: string): string {
        // 移除 .XXXXXX.enc / .XXXXXX.zec
        let stripped = fileName.replace(/\.[A-Za-z0-9]{6,}\.(?:enc|zec)$/, '');
        if (stripped !== fileName) return stripped;

        // 移除简单的 .enc / .zec
        stripped = fileName.replace(/\.(?:enc|zec)$/, '');
        return stripped;
    }

    // ====================================================================
    // 文件名加解密
    // ====================================================================

    /**
     * 加密文件名 — Base64编码
     */
    static encryptFileName(fileName: string, type: CryptType = CryptType.BASE64): string {
        switch (type) {
            case CryptType.BASE64: {
                // 使用URL安全的Base64编码
                const encoded = btoa(unescape(encodeURIComponent(fileName)));
                return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            }
            default:
                return fileName;
        }
    }

    /**
     * 解密文件名 — Base64解码
     */
    static decryptFileName(encodedName: string, type: CryptType = CryptType.BASE64): string {
        switch (type) {
            case CryptType.BASE64: {
                // 还原URL安全的Base64
                let base64 = encodedName.replace(/-/g, '+').replace(/_/g, '/');
                // 补齐padding
                while (base64.length % 4) base64 += '=';
                try {
                    return decodeURIComponent(escape(atob(base64)));
                } catch {
                    return encodedName;
                }
            }
            default:
                return encodedName;
        }
    }

    // ====================================================================
    // 文件内容加解密 (基于流)
    // ====================================================================

    /**
     * AES-256-CTR 加密
     * 使用 Web Crypto API (Cloudflare Workers 原生支持)
     */
    static async encryptAES256(
        data: ArrayBuffer,
        password: string
    ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
        // 从密码派生密钥
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: new TextEncoder().encode('openlist-crypt-salt'),
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-CTR', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        // 生成随机IV
        const iv = crypto.getRandomValues(new Uint8Array(16));

        // 加密数据
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-CTR', counter: iv, length: 64 },
            key,
            data
        );

        return { encrypted, iv };
    }

    /**
     * AES-256-CTR 解密
     */
    static async decryptAES256(
        encryptedData: ArrayBuffer,
        password: string,
        iv: Uint8Array
    ): Promise<ArrayBuffer> {
        // 从密码派生密钥
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: new TextEncoder().encode('openlist-crypt-salt'),
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-CTR', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        return await crypto.subtle.decrypt(
            { name: 'AES-CTR', counter: iv, length: 64 },
            key,
            encryptedData
        );
    }

    /**
     * XOR-32 流加密/解密（XOR是对称的，加解密相同）
     */
    static xor32(data: Uint8Array, key: string): Uint8Array {
        const keyBytes = new TextEncoder().encode(key);
        const result = new Uint8Array(data.length);

        for (let i = 0; i < data.length; i++) {
            result[i] = data[i] ^ keyBytes[i % keyBytes.length];
        }

        return result;
    }

    /**
     * CRC32 计算 — 用于加密后缀校验
     */
    static crc32(data: string): string {
        let crc = 0xFFFFFFFF;
        const bytes = new TextEncoder().encode(data);

        for (let i = 0; i < bytes.length; i++) {
            crc ^= bytes[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
            }
        }

        return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
    }

    // ====================================================================
    // 加密组路由 — 根据类型路由到对应的加解密模块
    // ====================================================================

    /**
     * 根据加密组配置对数据进行加密
     */
    static async encrypt(
        data: ArrayBuffer,
        config: CryptGroupConfig
    ): Promise<{ data: ArrayBuffer; metadata?: any }> {
        if (!(config.crypt_mode & CryptMode.ENCRYPT_CONTENT)) {
            return { data }; // 不加密内容
        }

        switch (config.crypt_type) {
            case CryptType.AES256: {
                const { encrypted, iv } = await this.encryptAES256(data, config.crypt_pass);
                return { data: encrypted, metadata: { iv: Array.from(iv) } };
            }
            case CryptType.XOR32: {
                const input = new Uint8Array(data);
                const result = this.xor32(input, config.crypt_pass);
                return { data: result.buffer };
            }
            case CryptType.CHACHA20: {
                // ChaCha20暂用AES-256替代，后续可扩展
                const { encrypted, iv } = await this.encryptAES256(data, config.crypt_pass);
                return { data: encrypted, metadata: { iv: Array.from(iv), type: 'chacha20-fallback' } };
            }
            case CryptType.BASE64:
            default:
                return { data }; // Base64仅用于文件名
        }
    }

    /**
     * 根据加密组配置对数据进行解密
     */
    static async decrypt(
        data: ArrayBuffer,
        config: CryptGroupConfig,
        metadata?: any
    ): Promise<ArrayBuffer> {
        if (!(config.crypt_mode & CryptMode.ENCRYPT_CONTENT)) {
            return data; // 未加密内容
        }

        switch (config.crypt_type) {
            case CryptType.AES256: {
                const iv = new Uint8Array(metadata?.iv || []);
                return await this.decryptAES256(data, config.crypt_pass, iv);
            }
            case CryptType.XOR32: {
                const input = new Uint8Array(data);
                const result = this.xor32(input, config.crypt_pass);
                return result.buffer;
            }
            case CryptType.CHACHA20: {
                // ChaCha20暂用AES-256替代
                const iv = new Uint8Array(metadata?.iv || []);
                return await this.decryptAES256(data, config.crypt_pass, iv);
            }
            case CryptType.BASE64:
            default:
                return data;
        }
    }

    /**
     * 处理文件名 — 根据配置加密或解密文件名
     */
    static processFileName(
        fileName: string,
        config: CryptGroupConfig,
        encrypt: boolean = true
    ): string {
        if (!(config.crypt_mode & CryptMode.ENCRYPT_NAME)) {
            return fileName; // 不加密文件名
        }

        if (encrypt) {
            return this.encryptFileName(fileName, config.crypt_type) + '.b64';
        } else {
            // 去除.b64后缀后解密
            const name = fileName.replace(/\.b64$/, '');
            return this.decryptFileName(name, config.crypt_type);
        }
    }
}
