export interface TasksConfig {
    tasks_uuid: string;
    tasks_type: string;
    tasks_user: string;
    tasks_info: string;
    tasks_flag: number;
}

export interface TasksResult {
    flag: boolean;
    text?: string;
    code?: number;
    data?: TasksConfig[];
}