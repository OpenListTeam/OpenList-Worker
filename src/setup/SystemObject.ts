// 系统信息配置
export interface SystemConfig {
    version?: string;
    build?: string;
    nodeVersion?: string;
    platform?: string;
    uptime?: string;
    memory?: string;
    cpuUsage?: string;
}

// 系统信息返回结果
export interface SystemResult {
    flag: boolean;
    text: string;
    data?: SystemConfig;
}
