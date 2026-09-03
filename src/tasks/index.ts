/**
 * 任务模块入口
 */
export type { TaskType, TaskState, TaskRecord, TaskListResult, IDownloadTool } from './TaskManager';
export { TaskManager, downloadToolRegistry, registerDownloadTool } from './TaskManager';