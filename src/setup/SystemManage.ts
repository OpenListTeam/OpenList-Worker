import { Context } from 'hono';
import { SystemResult, SystemConfig } from './SystemObject';
import * as os from 'os';
import * as process from 'process';

export class SystemManage {
    private context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    /**
     * 获取系统信息
     */
    async getSystemInfo(): Promise<SystemResult> {
        try {
            // 获取Node.js版本
            const nodeVersion = process.version;

            // 获取平台信息
            const platform = `${os.platform()} ${os.arch()}`;

            // 获取运行时间
            const uptime = this.formatUptime(process.uptime());

            // 获取内存使用情况
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const memory = `${this.formatBytes(usedMemory)} / ${this.formatBytes(totalMemory)}`;

            // 获取CPU使用率（简化版本）
            const cpus = os.cpus();
            const cpuModel = cpus[0]?.model || 'Unknown';
            const cpuCount = cpus.length;
            const cpuUsage = `${cpuModel} (${cpuCount} cores)`;

            // 读取package.json获取版本信息（如果存在）
            let version = '1.0.0';
            let build = new Date().toISOString().split('T')[0];

            try {
                // 尝试读取package.json
                const packageJson = require('../../package.json');
                version = packageJson.version || version;
            } catch (e) {
                // 如果读取失败，使用默认值
            }

            const systemInfo: SystemConfig = {
                version,
                build,
                nodeVersion,
                platform,
                uptime,
                memory,
                cpuUsage
            };

            return {
                flag: true,
                text: '获取系统信息成功',
                data: systemInfo
            };
        } catch (error: any) {
            console.error('获取系统信息失败:', error);
            return {
                flag: false,
                text: `获取系统信息失败: ${error.message}`
            };
        }
    }

    /**
     * 格式化运行时间
     */
    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        const parts: string[] = [];
        if (days > 0) parts.push(`${days}天`);
        if (hours > 0) parts.push(`${hours}小时`);
        if (minutes > 0) parts.push(`${minutes}分钟`);

        return parts.length > 0 ? parts.join(' ') : '少于1分钟';
    }

    /**
     * 格式化字节大小
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }
}
