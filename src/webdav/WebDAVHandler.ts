/**
 * WebDAV 服务端实现
 * 
 * 支持的 WebDAV 方法：
 *   - OPTIONS   : 返回支持的方法列表
 *   - PROPFIND  : 获取文件/目录属性（列出目录）
 *   - GET       : 下载文件
 *   - HEAD      : 获取文件元信息
 *   - PUT       : 上传文件
 *   - DELETE    : 删除文件/目录
 *   - MKCOL     : 创建目录
 *   - MOVE      : 移动/重命名
 *   - COPY      : 复制文件
 * 
 * 认证方式：HTTP Basic Auth（用户名密码与系统用户一致）
 * 
 * 挂载路径：/dav/*
 */
import type { Context } from 'hono';
import { MountManage } from '../mount/MountManage';
import { FileType, FileInfo } from '../files/FilesObject';
import { UsersManage } from '../users/UsersManage';

// ========================================================================
// XML 工具函数
// ========================================================================

/**
 * XML 转义
 */
function xmlEscape(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * 根据文件扩展名推断 MIME 类型
 */
function getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
        // 文本
        'txt': 'text/plain', 'html': 'text/html', 'htm': 'text/html',
        'css': 'text/css', 'js': 'application/javascript', 'json': 'application/json',
        'xml': 'application/xml', 'csv': 'text/csv', 'md': 'text/markdown',
        // 图片
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
        'ico': 'image/x-icon', 'bmp': 'image/bmp',
        // 视频
        'mp4': 'video/mp4', 'webm': 'video/webm', 'mkv': 'video/x-matroska',
        'avi': 'video/x-msvideo', 'mov': 'video/quicktime', 'flv': 'video/x-flv',
        // 音频
        'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac',
        'ogg': 'audio/ogg', 'aac': 'audio/aac', 'wma': 'audio/x-ms-wma',
        // 文档
        'pdf': 'application/pdf',
        'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // 压缩
        'zip': 'application/zip', 'rar': 'application/x-rar-compressed',
        'gz': 'application/gzip', 'tar': 'application/x-tar', '7z': 'application/x-7z-compressed',
    };
    return mimeMap[ext] || 'application/octet-stream';
}

/**
 * 格式化日期为 RFC 2822 格式（HTTP Date）
 */
function toHttpDate(date: Date | string | undefined): string {
    if (!date) return new Date().toUTCString();
    if (typeof date === 'string') return new Date(date).toUTCString();
    return date.toUTCString();
}

/**
 * 格式化日期为 ISO 8601 格式（WebDAV creationdate）
 */
function toISODate(date: Date | string | undefined): string {
    if (!date) return new Date().toISOString();
    if (typeof date === 'string') return new Date(date).toISOString();
    return date.toISOString();
}

// ========================================================================
// WebDAV 核心处理类
// ========================================================================

export class WebDAVHandler {
    private c: Context;
    private basePath: string = '/dav';

    constructor(c: Context) {
        this.c = c;
    }

    /**
     * 从请求路径中提取文件系统路径
     * /dav/some/path → /some/path
     */
    private getFilePath(): string {
        const url = new URL(this.c.req.url);
        let path = decodeURIComponent(url.pathname);
        // 移除 /dav 前缀
        if (path.startsWith(this.basePath)) {
            path = path.substring(this.basePath.length);
        }
        return path || '/';
    }

    /**
     * 从 Destination 头中提取目标路径
     */
    private getDestinationPath(): string | null {
        const dest = this.c.req.header('Destination');
        if (!dest) return null;
        try {
            const url = new URL(dest);
            let path = decodeURIComponent(url.pathname);
            if (path.startsWith(this.basePath)) {
                path = path.substring(this.basePath.length);
            }
            return path || '/';
        } catch {
            // 可能是相对路径
            let path = decodeURIComponent(dest);
            if (path.startsWith(this.basePath)) {
                path = path.substring(this.basePath.length);
            }
            return path || '/';
        }
    }

    /**
     * 获取挂载驱动
     */
    private async getDriver(path: string, isList: boolean = false): Promise<any> {
        const mount = new MountManage(this.c);
        return await mount.loader(path, isList, isList);
    }

    /**
     * 获取相对路径（去掉挂载点前缀）
     */
    private getRelativePath(path: string, driver: any): string {
        if (!driver || !driver[0]) return path;
        return path.replace(driver[0].router, '') || '/';
    }

    // ====================================================================
    // OPTIONS — 返回支持的方法
    // ====================================================================
    async handleOptions(): Promise<Response> {
        return new Response(null, {
            status: 200,
            headers: {
                'Allow': 'OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY',
                'DAV': '1, 2',
                'MS-Author-Via': 'DAV',
                'Content-Length': '0',
            },
        });
    }

    // ====================================================================
    // PROPFIND — 获取文件/目录属性
    // ====================================================================
    async handlePropfind(): Promise<Response> {
        const path = this.getFilePath();
        const depthHeader = this.c.req.header('Depth') || '1';
        const depth = depthHeader === 'infinity' ? Infinity : parseInt(depthHeader, 10);

        try {
            const driveLoad = await this.getDriver(path, true);
            if (!driveLoad) {
                return this.notFoundResponse(path);
            }

            const hasMainMount = driveLoad[0] !== null;
            const responses: string[] = [];

            if (hasMainMount) {
                await driveLoad[0].loadSelf();
                const relativePath = this.getRelativePath(path, driveLoad);

                // 当前目录/文件本身的属性
                responses.push(this.buildPropResponse(
                    `${this.basePath}${path === '/' ? '/' : path}`,
                    true, // 假设当前路径是目录
                    0,
                    new Date(),
                    new Date()
                ));

                // 如果 depth >= 1，列出子项
                if (depth >= 1) {
                    const pathInfo = await driveLoad[0].listFile({ path: relativePath });
                    if (pathInfo && pathInfo.fileList) {
                        for (const file of pathInfo.fileList) {
                            const filePath = path === '/'
                                ? `/${file.fileName}`
                                : `${path.replace(/\/$/, '')}/${file.fileName}`;
                            const isDir = file.fileType === FileType.F_DIR || file.fileType === 0;
                            responses.push(this.buildPropResponse(
                                `${this.basePath}${filePath}${isDir ? '/' : ''}`,
                                isDir,
                                file.fileSize || 0,
                                file.timeModify,
                                file.timeCreate
                            ));
                        }
                    }
                }
            } else {
                // 没有主挂载点，显示虚拟根目录
                responses.push(this.buildPropResponse(
                    `${this.basePath}${path}`,
                    true, 0, new Date(), new Date()
                ));
            }

            // 子挂载点作为目录显示
            if (depth >= 1) {
                for (let i = 1; i < driveLoad.length; i++) {
                    const sub = driveLoad[i];
                    let subName: string;
                    if (hasMainMount) {
                        subName = driveLoad[0].router === '/'
                            ? sub.router.substring(1)
                            : sub.router.substring(driveLoad[0].router.length).replace(/^\//, '');
                    } else {
                        const stripped = sub.router.substring(1);
                        const idx = stripped.indexOf('/');
                        subName = idx > 0 ? stripped.substring(0, idx) : stripped;
                    }
                    const subPath = path === '/'
                        ? `/${subName}`
                        : `${path.replace(/\/$/, '')}/${subName}`;
                    responses.push(this.buildPropResponse(
                        `${this.basePath}${subPath}/`,
                        true, 0, new Date(), new Date()
                    ));
                }
            }

            const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${responses.join('\n')}
</D:multistatus>`;

            return new Response(xml, {
                status: 207,
                headers: {
                    'Content-Type': 'application/xml; charset=utf-8',
                },
            });

        } catch (error: any) {
            console.error('WebDAV PROPFIND error:', error);
            return this.errorResponse(500, error.message);
        }
    }

    /**
     * 构建单个资源的 PROPFIND 响应
     */
    private buildPropResponse(
        href: string,
        isCollection: boolean,
        contentLength: number,
        lastModified: Date | string | undefined,
        creationDate: Date | string | undefined
    ): string {
        const resourceType = isCollection
            ? '<D:resourcetype><D:collection/></D:resourcetype>'
            : '<D:resourcetype/>';

        const fileName = href.split('/').filter(Boolean).pop() || '';
        const contentType = isCollection ? 'httpd/unix-directory' : getMimeType(fileName);

        return `  <D:response>
    <D:href>${xmlEscape(encodeURI(href))}</D:href>
    <D:propstat>
      <D:prop>
        ${resourceType}
        <D:getcontentlength>${contentLength}</D:getcontentlength>
        <D:getcontenttype>${contentType}</D:getcontenttype>
        <D:getlastmodified>${toHttpDate(lastModified)}</D:getlastmodified>
        <D:creationdate>${toISODate(creationDate)}</D:creationdate>
        <D:displayname>${xmlEscape(fileName)}</D:displayname>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
    }

    // ====================================================================
    // GET — 下载文件
    // ====================================================================
    async handleGet(): Promise<Response> {
        const path = this.getFilePath();

        try {
            const driveLoad = await this.getDriver(path, false);
            if (!driveLoad || !driveLoad[0]) {
                return this.notFoundResponse(path);
            }

            await driveLoad[0].loadSelf();
            const relativePath = this.getRelativePath(path, driveLoad);
            const fileLinks = await driveLoad[0].downFile({ path: relativePath });

            if (!fileLinks || fileLinks.length === 0) {
                return this.notFoundResponse(path);
            }

            const link = fileLinks[0];
            const fileName = path.split('/').pop() || 'file';
            const contentType = getMimeType(fileName);

            // 流式下载
            if (link.stream) {
                const streamResult = await link.stream(this.c);
                if (streamResult instanceof ReadableStream) {
                    return new Response(streamResult, {
                        status: 200,
                        headers: {
                            'Content-Type': contentType,
                            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                        },
                    });
                }
            }

            // URL 重定向下载
            if (link.direct) {
                // 代理下载（避免客户端不支持重定向）
                const resp = await fetch(link.direct, { headers: link.header });
                if (!resp.ok) {
                    return this.errorResponse(502, '上游下载失败');
                }
                return new Response(resp.body, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Content-Length': resp.headers.get('Content-Length') || '',
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                    },
                });
            }

            // 文本结果
            if (link.result) {
                return new Response(link.result, {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' },
                });
            }

            return this.notFoundResponse(path);

        } catch (error: any) {
            console.error('WebDAV GET error:', error);
            return this.errorResponse(500, error.message);
        }
    }

    // ====================================================================
    // HEAD — 获取文件元信息
    // ====================================================================
    async handleHead(): Promise<Response> {
        const path = this.getFilePath();

        try {
            const driveLoad = await this.getDriver(path, true);
            if (!driveLoad || !driveLoad[0]) {
                return this.notFoundResponse(path);
            }

            const fileName = path.split('/').pop() || '';
            return new Response(null, {
                status: 200,
                headers: {
                    'Content-Type': getMimeType(fileName),
                    'Last-Modified': new Date().toUTCString(),
                },
            });
        } catch {
            return this.notFoundResponse(path);
        }
    }

    // ====================================================================
    // PUT — 上传文件
    // ====================================================================
    async handlePut(): Promise<Response> {
        const path = this.getFilePath();

        try {
            const driveLoad = await this.getDriver(path, false);
            if (!driveLoad || !driveLoad[0]) {
                return this.errorResponse(409, '父目录不存在');
            }

            await driveLoad[0].loadSelf();
            const relativePath = this.getRelativePath(path, driveLoad);

            // 获取上传的文件内容
            const body = await this.c.req.arrayBuffer();
            const fileName = path.split('/').pop() || 'file';

            // 构建目录路径和文件名
            const parentPath = relativePath.includes('/')
                ? relativePath.substring(0, relativePath.lastIndexOf('/')) || '/'
                : '/';

            // 创建一个类似 File 的对象
            const fileObj = new File([body], fileName, {
                type: getMimeType(fileName),
            });

            const result = await driveLoad[0].pushFile(
                { path: parentPath },
                fileName,
                FileType.F_ALL,
                fileObj
            );

            if (result && result.flag === false) {
                return this.errorResponse(500, result.text || '上传失败');
            }

            return new Response(null, {
                status: 201,
                headers: { 'Content-Length': '0' },
            });

        } catch (error: any) {
            console.error('WebDAV PUT error:', error);
            return this.errorResponse(500, error.message);
        }
    }

    // ====================================================================
    // DELETE — 删除文件/目录
    // ====================================================================
    async handleDelete(): Promise<Response> {
        const path = this.getFilePath();

        try {
            const driveLoad = await this.getDriver(path, false);
            if (!driveLoad || !driveLoad[0]) {
                return this.notFoundResponse(path);
            }

            await driveLoad[0].loadSelf();
            const relativePath = this.getRelativePath(path, driveLoad);

            const result = await driveLoad[0].killFile({ path: relativePath });

            if (result && result.flag === false) {
                return this.errorResponse(500, result.text || '删除失败');
            }

            return new Response(null, { status: 204 });

        } catch (error: any) {
            console.error('WebDAV DELETE error:', error);
            return this.errorResponse(500, error.message);
        }
    }

    // ====================================================================
    // MKCOL — 创建目录
    // ====================================================================
    async handleMkcol(): Promise<Response> {
        const path = this.getFilePath();

        try {
            const driveLoad = await this.getDriver(path, false);
            if (!driveLoad || !driveLoad[0]) {
                return this.errorResponse(409, '父目录不存在');
            }

            await driveLoad[0].loadSelf();
            const relativePath = this.getRelativePath(path, driveLoad);

            // 分离父目录和新目录名
            const parentPath = relativePath.includes('/')
                ? relativePath.substring(0, relativePath.lastIndexOf('/')) || '/'
                : '/';
            const dirName = relativePath.split('/').filter(Boolean).pop() || '';

            if (!dirName) {
                return this.errorResponse(400, '无效的目录名');
            }

            const result = await driveLoad[0].makeFile(
                { path: parentPath },
                dirName + '/',
                FileType.F_DIR
            );

            if (result && result.flag === false) {
                return this.errorResponse(500, result.text || '创建目录失败');
            }

            return new Response(null, { status: 201 });

        } catch (error: any) {
            console.error('WebDAV MKCOL error:', error);
            return this.errorResponse(500, error.message);
        }
    }

    // ====================================================================
    // MOVE — 移动/重命名
    // ====================================================================
    async handleMove(): Promise<Response> {
        const sourcePath = this.getFilePath();
        const destPath = this.getDestinationPath();

        if (!destPath) {
            return this.errorResponse(400, '缺少 Destination 头');
        }

        try {
            const driveLoad = await this.getDriver(sourcePath, false);
            if (!driveLoad || !driveLoad[0]) {
                return this.notFoundResponse(sourcePath);
            }

            await driveLoad[0].loadSelf();
            const relativeSource = this.getRelativePath(sourcePath, driveLoad);
            const relativeDest = this.getRelativePath(destPath, driveLoad);

            const result = await driveLoad[0].moveFile(
                { path: relativeSource },
                { path: relativeDest }
            );

            if (result && result.flag === false) {
                return this.errorResponse(500, result.text || '移动失败');
            }

            return new Response(null, { status: 201 });

        } catch (error: any) {
            console.error('WebDAV MOVE error:', error);
            return this.errorResponse(500, error.message);
        }
    }

    // ====================================================================
    // COPY — 复制文件
    // ====================================================================
    async handleCopy(): Promise<Response> {
        const sourcePath = this.getFilePath();
        const destPath = this.getDestinationPath();

        if (!destPath) {
            return this.errorResponse(400, '缺少 Destination 头');
        }

        try {
            const driveLoad = await this.getDriver(sourcePath, false);
            if (!driveLoad || !driveLoad[0]) {
                return this.notFoundResponse(sourcePath);
            }

            await driveLoad[0].loadSelf();
            const relativeSource = this.getRelativePath(sourcePath, driveLoad);
            const relativeDest = this.getRelativePath(destPath, driveLoad);

            const result = await driveLoad[0].copyFile(
                { path: relativeSource },
                { path: relativeDest }
            );

            if (result && result.flag === false) {
                return this.errorResponse(500, result.text || '复制失败');
            }

            return new Response(null, { status: 201 });

        } catch (error: any) {
            console.error('WebDAV COPY error:', error);
            return this.errorResponse(500, error.message);
        }
    }

    // ====================================================================
    // 错误响应工具
    // ====================================================================
    private notFoundResponse(path: string): Response {
        return new Response(
            `<?xml version="1.0" encoding="utf-8"?>
<D:error xmlns:D="DAV:">
  <D:message>Resource not found: ${xmlEscape(path)}</D:message>
</D:error>`,
            {
                status: 404,
                headers: { 'Content-Type': 'application/xml; charset=utf-8' },
            }
        );
    }

    private errorResponse(status: number, message: string): Response {
        return new Response(
            `<?xml version="1.0" encoding="utf-8"?>
<D:error xmlns:D="DAV:">
  <D:message>${xmlEscape(message)}</D:message>
</D:error>`,
            {
                status,
                headers: { 'Content-Type': 'application/xml; charset=utf-8' },
            }
        );
    }
}
