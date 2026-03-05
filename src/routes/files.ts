/**
 * 文件操作路由 — /@files
 * 处理文件浏览、上传、下载、复制、移动、删除
 * 
 * 认证由全局中间件统一处理，此处无需重复检查
 */
import type { Hono, Context } from 'hono';
import { FilesManage } from '../files/FilesManage';
import { getConfig } from '../types/HonoParsers';

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
}
