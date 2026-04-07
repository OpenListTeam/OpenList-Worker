/**
 * 媒体库路由 — /@media
 * 提供按文件类型分类检索的API
 * 
 * 支持软认证：未登录用户可浏览公共媒体，登录用户可浏览更多
 */
import type { Hono, Context } from 'hono';
import { MediaManage, MediaCategory } from '../media/MediaManage';

const VALID_CATEGORIES: MediaCategory[] = ['video', 'music', 'image', 'books'];

export function mediaRoutes(app: Hono<any>) {

    // /@media/list/:category — 获取指定分类的媒体文件列表
    app.get('/@media/list/:category', async (c: Context): Promise<any> => {
        const category = c.req.param('category') as MediaCategory;

        if (!VALID_CATEGORIES.includes(category)) {
            return c.json({
                flag: false,
                text: `无效的媒体分类: ${category}，支持: ${VALID_CATEGORIES.join(', ')}`
            }, 400);
        }

        const page = parseInt(c.req.query('page') || '1', 10);
        const pageSize = Math.min(parseInt(c.req.query('pageSize') || '50', 10), 200);
        const keyword = c.req.query('keyword') || undefined;
        const mountPath = c.req.query('mount') || undefined;

        const media = new MediaManage(c);
        const result = await media.list(category, page, pageSize, keyword, mountPath);

        return c.json(result, result.flag ? 200 : 500);
    });

    // /@media/stats — 获取媒体库各分类统计信息
    app.get('/@media/stats', async (c: Context): Promise<any> => {
        const media = new MediaManage(c);
        const result = await media.stats();
        return c.json(result, result.flag ? 200 : 500);
    });

    // /@media/categories — 获取支持的媒体分类和对应扩展名
    app.get('/@media/categories', async (c: Context): Promise<any> => {
        return c.json({
            flag: true,
            text: 'Success',
            data: {
                video: {
                    title: '视频影音',
                    extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'm4v', 'rmvb', 'rm', '3gp', 'mpg', 'mpeg', 'vob'],
                },
                music: {
                    title: '音乐音频',
                    extensions: ['mp3', 'flac', 'wav', 'aac', 'ogg', 'wma', 'ape', 'alac', 'm4a', 'opus', 'aiff', 'dsf', 'dff'],
                },
                image: {
                    title: '照片图片',
                    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', 'ico', 'heic', 'heif', 'avif', 'raw', 'cr2', 'nef'],
                },
                books: {
                    title: '书籍报刊',
                    extensions: ['pdf', 'epub', 'mobi', 'azw3', 'djvu', 'cbr', 'cbz', 'fb2', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt'],
                },
            },
        });
    });
}
