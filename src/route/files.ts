/**
 * 文件操作路由 — /@files
 * 处理文件浏览、上传、下载、复制、移动、删除、加密、解密
 * 
 * 认证由全局中间件统一处理，此处无需重复检查
 */
import type { Hono, Context } from 'hono';
import { FilesManage } from '../files/FilesManage';
import { CryptEngine, CryptType, CryptMode as CryptModeBit, CryptGroupConfig } from '../crypt/CryptEngine';
import { CryptManage } from '../crypt/CryptManage';
import { CryptInfo } from '../crypt/CryptObject';
import { MountManage } from '../mount/MountManage';
import { getConfig } from '../types/HonoParsers';

/**
 * 将 CryptInfo (数据库模型) 转换为 CryptGroupConfig (引擎模型)
 */
function toCryptGroupConfig(info: CryptInfo): CryptGroupConfig {
    return {
        crypt_name: info.crypt_name,
        crypt_pass: info.crypt_pass,
        crypt_type: info.crypt_type as CryptType,
        crypt_mode: info.crypt_mode,
        is_enabled: info.is_enabled,
        crypt_self: info.crypt_self,
        rands_pass: info.rands_pass,
        write_name: info.write_name || 'enc',
    };
}

export function filesRoutes(app: Hono<any>) {
    // /@files/:action/:method/* — 文件操作路由
    app.all('/@files/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');

        const upload = await c.req.parseBody();
        const source: string = "/" + c.req.path.split('/').slice(4).join('/');
        const target: string | undefined = c.req.query('target');
        const driver: string | undefined = c.req.query('driver');
        const config: Record<string, any> = await getConfig(c, 'config');

        // 方法路由
        switch (method) {
            case "path": { config.mount_path = target; break; }
            case "uuid": { break; }
            case "none": { break; }
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        const files: FilesManage = new FilesManage(c);
        return await files.action(action, source, target, config, driver, upload);
    });

    // ========================================================================
    // /@files/encrypt/* — 文件加密操作
    // 
    // 流程：
    //   1. 根据 crypt_name 查找加密组配置
    //   2. 验证密码是否匹配
    //   3. 通过 MountManage 获取文件内容
    //   4. 使用 CryptEngine 加密文件内容和/或文件名
    //   5. 写回加密后的文件（带加密后缀）
    // ========================================================================
    app.post('/@files/encrypt/*', async (c: Context): Promise<any> => {
        const source: string = "/" + c.req.path.split('/').slice(3).join('/');
        const config: Record<string, any> = await getConfig(c, 'config');
        
        // 参数验证
        if (!config.crypt_name && !config.crypt_pass) {
            return c.json({ flag: false, text: '请提供加密配置名称或密码' }, 400);
        }

        try {
            let cryptConfig: CryptGroupConfig;

            if (config.crypt_name) {
                // 方式1：使用已有的加密组
                const cryptManage = new CryptManage(c);
                const cryptResult = await cryptManage.select(config.crypt_name);
                
                if (!cryptResult.flag || !cryptResult.data || cryptResult.data.length === 0) {
                    return c.json({ flag: false, text: '加密组不存在' }, 404);
                }

                const cryptInfo = cryptResult.data[0];
                if (!cryptInfo.is_enabled) {
                    return c.json({ flag: false, text: '加密组已禁用' }, 400);
                }

                // 如果加密组不存储密码(crypt_self=false)，需要用户提供密码
                if (!cryptInfo.crypt_self && !config.crypt_pass) {
                    return c.json({ flag: false, text: '此加密组需要提供密码' }, 400);
                }

                cryptConfig = toCryptGroupConfig(cryptInfo);
                // 如果用户提供了密码，使用用户提供的密码（覆盖存储的密码）
                if (config.crypt_pass) {
                    cryptConfig.crypt_pass = config.crypt_pass;
                }
            } else {
                // 方式2：临时加密（用户手动指定参数）
                cryptConfig = {
                    crypt_name: '_temp_',
                    crypt_pass: config.crypt_pass,
                    crypt_type: config.crypt_type ?? CryptType.AES256,
                    crypt_mode: config.crypt_mode ?? CryptModeBit.ENCRYPT_CONTENT,
                    is_enabled: true,
                    crypt_self: false,
                    rands_pass: false,
                    write_name: config.write_name || 'enc',
                };
            }

            // 获取文件内容
            const mountManage = new MountManage(c);
            const driveLoad = await mountManage.loader(source, false, false);
            if (!driveLoad || !driveLoad[0]) {
                return c.json({ flag: false, text: '文件不存在或无法访问' }, 404);
            }

            await driveLoad[0].loadSelf();
            const relativePath = source.replace(driveLoad[0].router, '') || '/';

            // 获取下载链接/流
            const fileLinks = await driveLoad[0].downFile({ path: relativePath });
            if (!fileLinks || fileLinks.length === 0) {
                return c.json({ flag: false, text: '无法获取文件内容' }, 500);
            }

            let fileData: ArrayBuffer;
            const link = fileLinks[0];

            if (link.stream) {
                // 流式读取
                const streamResult = await link.stream(c);
                if (streamResult instanceof ReadableStream) {
                    const reader = streamResult.getReader();
                    const chunks: Uint8Array[] = [];
                    let done = false;
                    while (!done) {
                        const { value, done: d } = await reader.read();
                        if (value) chunks.push(value);
                        done = d;
                    }
                    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
                    const merged = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const chunk of chunks) {
                        merged.set(chunk, offset);
                        offset += chunk.length;
                    }
                    fileData = merged.buffer;
                } else {
                    return c.json({ flag: false, text: '流式读取失败' }, 500);
                }
            } else if (link.direct) {
                // URL下载
                const resp = await fetch(link.direct, { headers: link.header });
                if (!resp.ok) {
                    return c.json({ flag: false, text: '下载文件失败' }, 500);
                }
                fileData = await resp.arrayBuffer();
            } else {
                return c.json({ flag: false, text: '无法获取文件数据' }, 500);
            }

            // 使用 CryptEngine 加密
            const encryptResult = await CryptEngine.encrypt(fileData, cryptConfig);

            // 处理文件名
            const fileName = source.split('/').pop() || 'file';
            let newFileName = fileName;

            // 加密文件名（如果配置了）
            if (cryptConfig.crypt_mode & CryptModeBit.ENCRYPT_NAME) {
                newFileName = CryptEngine.processFileName(fileName, cryptConfig, true);
            }

            // 添加加密后缀
            const crc32 = CryptEngine.crc32(cryptConfig.crypt_pass);
            const suffix = CryptEngine.buildSuffix(cryptConfig, crc32);
            newFileName = newFileName + suffix;

            // 构建加密元数据（存储IV等信息，用于解密）
            const metadata = encryptResult.metadata ? JSON.stringify(encryptResult.metadata) : '';

            return c.json({
                flag: true,
                text: '文件加密成功',
                data: {
                    path: source,
                    crypt_name: cryptConfig.crypt_name,
                    new_file_name: newFileName,
                    original_size: fileData.byteLength,
                    encrypted_size: encryptResult.data.byteLength,
                    metadata: metadata,
                    // 加密后的数据以base64返回（小文件）或需要通过上传接口写回
                    encrypted_base64: encryptResult.data.byteLength < 10 * 1024 * 1024
                        ? btoa(String.fromCharCode(...new Uint8Array(encryptResult.data)))
                        : undefined,
                }
            });

        } catch (error: any) {
            console.error('文件加密失败:', error);
            return c.json({ flag: false, text: error.message || '文件加密失败' }, 500);
        }
    });

    // ========================================================================
    // /@files/decrypt/* — 文件解密操作
    //
    // 流程：
    //   1. 解析文件名中的加密后缀，识别加密类型
    //   2. 根据 crypt_name 或用户提供的密码构建解密配置
    //   3. 获取加密文件内容
    //   4. 使用 CryptEngine 解密
    //   5. 返回解密后的文件内容或写回解密文件
    // ========================================================================
    app.post('/@files/decrypt/*', async (c: Context): Promise<any> => {
        const source: string = "/" + c.req.path.split('/').slice(3).join('/');
        const config: Record<string, any> = await getConfig(c, 'config');
        
        if (!config.crypt_pass && !config.crypt_name) {
            return c.json({ flag: false, text: '请提供解密密码或加密组名称' }, 400);
        }

        try {
            // 解析文件名中的加密后缀
            const fileName = source.split('/').pop() || '';
            const suffixInfo = CryptEngine.parseSuffix(fileName);

            let cryptConfig: CryptGroupConfig;

            if (config.crypt_name) {
                // 使用已有的加密组
                const cryptManage = new CryptManage(c);
                const cryptResult = await cryptManage.select(config.crypt_name);
                
                if (!cryptResult.flag || !cryptResult.data || cryptResult.data.length === 0) {
                    return c.json({ flag: false, text: '加密组不存在' }, 404);
                }

                const cryptInfo = cryptResult.data[0];
                cryptConfig = toCryptGroupConfig(cryptInfo);
                if (config.crypt_pass) {
                    cryptConfig.crypt_pass = config.crypt_pass;
                }
            } else {
                // 临时解密：根据后缀信息或用户指定的参数
                let cryptType = config.crypt_type ?? CryptType.AES256;
                let cryptMode = config.crypt_mode ?? CryptModeBit.ENCRYPT_CONTENT;

                // 如果有加密后缀，从后缀解析加密信息
                if (suffixInfo && suffixInfo.code !== '0000') {
                    const parsed = CryptEngine.parseCode(suffixInfo.code);
                    cryptType = parsed.algorithm;
                    cryptMode = 0;
                    if (parsed.encryptContent) cryptMode |= CryptModeBit.ENCRYPT_CONTENT;
                    if (parsed.encryptName) cryptMode |= CryptModeBit.ENCRYPT_NAME;
                    if (parsed.crc32AsKey) cryptMode |= CryptModeBit.SELF_DECRYPT;
                }

                cryptConfig = {
                    crypt_name: '_temp_',
                    crypt_pass: config.crypt_pass,
                    crypt_type: cryptType,
                    crypt_mode: cryptMode,
                    is_enabled: true,
                    crypt_self: false,
                    rands_pass: false,
                    write_name: 'enc',
                };
            }

            // 密码校验：如果有CRC32后缀，验证密码
            if (suffixInfo && suffixInfo.crc32) {
                const passCrc = CryptEngine.crc32(cryptConfig.crypt_pass);
                if (passCrc !== suffixInfo.crc32) {
                    return c.json({ flag: false, text: '解密密码不正确' }, 403);
                }
            }

            // 获取加密文件内容
            const mountManage = new MountManage(c);
            const driveLoad = await mountManage.loader(source, false, false);
            if (!driveLoad || !driveLoad[0]) {
                return c.json({ flag: false, text: '文件不存在或无法访问' }, 404);
            }

            await driveLoad[0].loadSelf();
            const relativePath = source.replace(driveLoad[0].router, '') || '/';

            const fileLinks = await driveLoad[0].downFile({ path: relativePath });
            if (!fileLinks || fileLinks.length === 0) {
                return c.json({ flag: false, text: '无法获取文件内容' }, 500);
            }

            let fileData: ArrayBuffer;
            const link = fileLinks[0];

            if (link.stream) {
                const streamResult = await link.stream(c);
                if (streamResult instanceof ReadableStream) {
                    const reader = streamResult.getReader();
                    const chunks: Uint8Array[] = [];
                    let done = false;
                    while (!done) {
                        const { value, done: d } = await reader.read();
                        if (value) chunks.push(value);
                        done = d;
                    }
                    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
                    const merged = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const chunk of chunks) {
                        merged.set(chunk, offset);
                        offset += chunk.length;
                    }
                    fileData = merged.buffer;
                } else {
                    return c.json({ flag: false, text: '流式读取失败' }, 500);
                }
            } else if (link.direct) {
                const resp = await fetch(link.direct, { headers: link.header });
                if (!resp.ok) {
                    return c.json({ flag: false, text: '下载文件失败' }, 500);
                }
                fileData = await resp.arrayBuffer();
            } else {
                return c.json({ flag: false, text: '无法获取文件数据' }, 500);
            }

            // 解析元数据（如果请求中提供了）
            let metadata: any = undefined;
            if (config.metadata) {
                try {
                    metadata = typeof config.metadata === 'string'
                        ? JSON.parse(config.metadata) : config.metadata;
                } catch { /* 忽略解析错误 */ }
            }

            // 使用 CryptEngine 解密
            const decryptedData = await CryptEngine.decrypt(fileData, cryptConfig, metadata);

            // 还原文件名
            let originalFileName = fileName;
            originalFileName = CryptEngine.stripSuffix(originalFileName);
            if (cryptConfig.crypt_mode & CryptModeBit.ENCRYPT_NAME) {
                originalFileName = CryptEngine.processFileName(originalFileName, cryptConfig, false);
            }

            return c.json({
                flag: true,
                text: '文件解密成功',
                data: {
                    path: source,
                    original_name: originalFileName,
                    encrypted_size: fileData.byteLength,
                    decrypted_size: decryptedData.byteLength,
                    // 解密后的数据以base64返回（小文件）
                    decrypted_base64: decryptedData.byteLength < 10 * 1024 * 1024
                        ? btoa(String.fromCharCode(...new Uint8Array(decryptedData)))
                        : undefined,
                }
            });

        } catch (error: any) {
            console.error('文件解密失败:', error);
            return c.json({ flag: false, text: error.message || '文件解密失败' }, 500);
        }
    });

    // ========================================================================
    // /@files/crypt-preview/* — 加密文件预览（解密后直接返回流）
    // 用于前端预览加密文件，不需要写回文件
    // ========================================================================
    app.post('/@files/crypt-preview/*', async (c: Context): Promise<any> => {
        const source: string = "/" + c.req.path.split('/').slice(3).join('/');
        const config: Record<string, any> = await getConfig(c, 'config');

        if (!config.crypt_pass && !config.crypt_name) {
            return c.json({ flag: false, text: '请提供解密密码或加密组名称' }, 400);
        }

        try {
            let cryptConfig: CryptGroupConfig;

            if (config.crypt_name) {
                const cryptManage = new CryptManage(c);
                const cryptResult = await cryptManage.select(config.crypt_name);
                if (!cryptResult.flag || !cryptResult.data || cryptResult.data.length === 0) {
                    return c.json({ flag: false, text: '加密组不存在' }, 404);
                }
                cryptConfig = toCryptGroupConfig(cryptResult.data[0]);
                if (config.crypt_pass) cryptConfig.crypt_pass = config.crypt_pass;
            } else {
                cryptConfig = {
                    crypt_name: '_temp_',
                    crypt_pass: config.crypt_pass,
                    crypt_type: config.crypt_type ?? CryptType.AES256,
                    crypt_mode: config.crypt_mode ?? CryptModeBit.ENCRYPT_CONTENT,
                    is_enabled: true,
                    crypt_self: false,
                    rands_pass: false,
                    write_name: 'enc',
                };
            }

            // 获取文件
            const mountManage = new MountManage(c);
            const driveLoad = await mountManage.loader(source, false, false);
            if (!driveLoad || !driveLoad[0]) {
                return c.json({ flag: false, text: '文件不存在' }, 404);
            }

            await driveLoad[0].loadSelf();
            const relativePath = source.replace(driveLoad[0].router, '') || '/';
            const fileLinks = await driveLoad[0].downFile({ path: relativePath });
            if (!fileLinks || fileLinks.length === 0) {
                return c.json({ flag: false, text: '无法获取文件' }, 500);
            }

            let fileData: ArrayBuffer;
            const link = fileLinks[0];

            if (link.direct) {
                const resp = await fetch(link.direct, { headers: link.header });
                if (!resp.ok) return c.json({ flag: false, text: '下载失败' }, 500);
                fileData = await resp.arrayBuffer();
            } else if (link.stream) {
                const streamResult = await link.stream(c);
                if (streamResult instanceof ReadableStream) {
                    const reader = streamResult.getReader();
                    const chunks: Uint8Array[] = [];
                    let done = false;
                    while (!done) {
                        const { value, done: d } = await reader.read();
                        if (value) chunks.push(value);
                        done = d;
                    }
                    const totalLength = chunks.reduce((acc, ch) => acc + ch.length, 0);
                    const merged = new Uint8Array(totalLength);
                    let off = 0;
                    for (const ch of chunks) { merged.set(ch, off); off += ch.length; }
                    fileData = merged.buffer;
                } else {
                    return c.json({ flag: false, text: '流式读取失败' }, 500);
                }
            } else {
                return c.json({ flag: false, text: '无法获取文件数据' }, 500);
            }

            // 解密
            let metadata: any = undefined;
            if (config.metadata) {
                try { metadata = JSON.parse(config.metadata); } catch {}
            }
            const decrypted = await CryptEngine.decrypt(fileData, cryptConfig, metadata);

            // 还原文件名以推断MIME类型
            const fileName = source.split('/').pop() || '';
            const originalName = CryptEngine.stripSuffix(fileName);
            const ext = originalName.split('.').pop()?.toLowerCase() || '';
            const mimeMap: Record<string, string> = {
                'mp4': 'video/mp4', 'webm': 'video/webm', 'mkv': 'video/x-matroska',
                'mp3': 'audio/mpeg', 'flac': 'audio/flac', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
                'pdf': 'application/pdf', 'txt': 'text/plain', 'html': 'text/html',
                'json': 'application/json', 'xml': 'application/xml',
            };
            const contentType = mimeMap[ext] || 'application/octet-stream';

            // 直接返回解密后的二进制流
            return new Response(decrypted, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': decrypted.byteLength.toString(),
                    'Content-Disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
                },
            });

        } catch (error: any) {
            console.error('加密文件预览失败:', error);
            return c.json({ flag: false, text: error.message || '预览失败' }, 500);
        }
    });
}
