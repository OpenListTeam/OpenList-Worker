/**
 * 公开 API 路由 — /api/public/*
 * 与 GO 后端 server/router.go 中 public 路由组对齐
 *
 * 端点（均无需认证）：
 *   GET|POST /api/public/settings              — 站点公开配置
 *   GET|POST /api/public/offline_download_tools — 离线下载工具列表
 *   GET|POST /api/public/archive_extensions     — 支持的归档格式扩展名
 */
import type { Hono, Context } from 'hono';
import { successResp, errorResp } from '../types/HttpResponse';

export function publicRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // /api/public/settings — 站点公开设置
    // 与 Go 后端 handles.PublicSettings 对齐
    // ------------------------------------------------------------------
    app.all('/api/public/settings', async (c: Context): Promise<any> => {
        try {
            const { AdminManage } = await import('../admin/AdminManage');
            const adminManage = new AdminManage(c);

            // 读取多项公开设置
            const keys = [
                'site_title',
                'logo',
                'favicon',
                'announcement',
                'allow_registration',
                'default_page_size',
                'version',
            ];
            const results = await Promise.all(
                keys.map(async (key) => {
                    const setting = await adminManage.select(key);
                    return { key, value: setting.data?.[0]?.admin_data ?? '' };
                })
            );

            const data: Record<string, string> = {};
            for (const { key, value } of results) {
                data[key] = value;
            }

            // 补充固定值
            data.version = data.version || 'tsworker-1.0.0';

            return successResp(c, data);
        } catch (e: any) {
            // 数据库不可用时返回默认值
            return successResp(c, {
                site_title: 'OpenList',
                logo: '',
                favicon: '',
                announcement: '',
                allow_registration: 'true',
                default_page_size: '50',
                version: 'tsworker-1.0.0',
            });
        }
    });

    // ------------------------------------------------------------------
    // /api/public/offline_download_tools — 离线下载工具列表
    // 与 Go 后端 handles.OfflineDownloadTools 对齐
    // ------------------------------------------------------------------
    app.all('/api/public/offline_download_tools', async (c: Context): Promise<any> => {
        // 返回当前支持的离线下载工具及其状态
        const tools = [
            { key: 'aria2', name: 'Aria2', enabled: true, description: '通用 HTTP/BT 下载引擎' },
            { key: 'qbit', name: 'qBittorrent', enabled: true, description: 'BT/PT 下载客户端' },
            { key: 'transmission', name: 'Transmission', enabled: true, description: '轻量级 BT 下载客户端' },
            { key: '115', name: '115 网盘离线', enabled: true, description: '115 网盘内置离线下载' },
            { key: '123', name: '123 网盘离线', enabled: true, description: '123 云盘内置离线下载' },
            { key: 'pikpak', name: 'PikPak 离线', enabled: true, description: 'PikPak 内置离线下载' },
            { key: 'thunder', name: '迅雷云盘离线', enabled: true, description: '迅雷云盘内置离线下载' },
            { key: 'thunder_browser', name: '迅雷浏览器版', enabled: true, description: '迅雷浏览器版本离线' },
        ];

        return successResp(c, tools);
    });

    // ------------------------------------------------------------------
    // /api/public/archive_extensions — 支持的归档格式扩展名
    // 与 Go 后端 handles.ArchiveExtensions 对齐
    // ------------------------------------------------------------------
    app.all('/api/public/archive_extensions', async (c: Context): Promise<any> => {
        const formats = [
            { extension: '.zip', description: 'ZIP 归档', supports_extract: true, supports_preview: true },
            { extension: '.7z', description: '7-Zip 归档', supports_extract: false, supports_preview: false, note: 'Cloudflare Workers 环境暂不支持' },
            { extension: '.rar', description: 'RAR 归档', supports_extract: false, supports_preview: false, note: 'Cloudflare Workers 环境暂不支持' },
            { extension: '.tar', description: 'TAR 归档', supports_extract: true, supports_preview: true },
            { extension: '.gz', description: 'GZip 压缩', supports_extract: true, supports_preview: true },
            { extension: '.iso', description: 'ISO 光盘镜像', supports_extract: false, supports_preview: false, note: 'Cloudflare Workers 环境暂不支持' },
        ];

        return successResp(c, formats);
    });
}
