/**
 * 消息中心（MessageCenter）
 * 
 * 对齐 Go 后端 internal/message 体系。
 * 在 Workers 环境下使用 Server-Sent Events (SSE) 替代 WebSocket，
 * 免费计划自动降级为 long-polling。
 */
import type { Context } from 'hono';

export interface Message {
    id: string;
    type: 'info' | 'warning' | 'error' | 'task_complete' | 'announcement';
    title: string;
    content: string;
    user_id?: string;    // 目标用户（空=全体）
    read: boolean;
    created_at: string;
}

export class MessageCenter {
    private c: Context;

    constructor(c: Context) {
        this.c = c;
    }

    /** 获取用户消息 */
    async getMessages(userId: string, limit: number = 20): Promise<Message[]> {
        const d1 = this.c.env?.D1_DATA;
        if (!d1) return [];

        try {
            const rows = await d1.prepare(
                `SELECT * FROM messages WHERE user_id = ? OR user_id IS NULL OR user_id = '' ORDER BY created_at DESC LIMIT ?`
            ).bind(userId, limit).all();

            return (rows.results || []).map((r: any) => ({
                id: r.id,
                type: r.type,
                title: r.title,
                content: r.content,
                user_id: r.user_id,
                read: r.read === 1,
                created_at: r.created_at,
            }));
        } catch {
            return [];
        }
    }

    /** 发送消息 */
    async sendMessage(msg: Omit<Message, 'id' | 'read' | 'created_at'>): Promise<boolean> {
        const d1 = this.c.env?.D1_DATA;
        if (!d1) return false;

        const id = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const now = new Date().toISOString();

        try {
            await d1.prepare(
                `INSERT INTO messages (id, type, title, content, user_id, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(id, msg.type, msg.title, msg.content, msg.user_id || '', 0, now).run();
            return true;
        } catch {
            return false;
        }
    }

    /** 标记已读 */
    async markRead(messageId: string, userId: string): Promise<boolean> {
        const d1 = this.c.env?.D1_DATA;
        if (!d1) return false;
        try {
            await d1.prepare('UPDATE messages SET read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL OR user_id = \'\')')
                .bind(messageId, userId).run();
            return true;
        } catch { return false; }
    }

    /** SSE 流式推送（Workers 环境首选） */
    static sseStream(c: Context, userId: string): Response {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                // 发送初始连接确认
                controller.enqueue(encoder.encode('event: connected\ndata: {"status":"ok"}\n\n'));

                // 每 30 秒发送心跳
                const heartbeat = setInterval(() => {
                    try {
                        controller.enqueue(encoder.encode(': heartbeat\n\n'));
                    } catch {
                        clearInterval(heartbeat);
                    }
                }, 30000);

                // 30 分钟后自动关闭（Workers CPU 限制）
                setTimeout(() => {
                    clearInterval(heartbeat);
                    try { controller.close(); } catch {}
                }, 25 * 60 * 1000);
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        });
    }
}
