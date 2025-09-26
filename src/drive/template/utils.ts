// 公用导入 =====================================================
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
// 专用导入 =====================================================
/* TODO: 在此处添加您的导入*/

export class HostClouds extends BasicClouds {
    // 专用成员 ============================================
    /* TODO: 在此处添加您的类成员*/

    // 构造函数 ================================================
    constructor(c: Context, router: string,
                config: Record<string, any> | any,
                saving: Record<string, any> | any) {
        super(c, router, config, saving);
    }

    // 初始接口 ================================================
    async initConfig(): Promise<DriveResult> {
        /* TODO: 在此处添加您的初始化操作*/
        return {
            flag: true,
            text: "",
        };
    }

    // 载入配置 ================================================
    async loadConfig(): Promise<DriveResult> {
        /* TODO: 在此处添加加载驱动的操作*/
        return {
            flag: true,
            text: "",
        };
    }

    // 载入存储 ================================================
    async loadSaving(): Promise<DriveResult> {
        /* TODO: 在此处添加加载驱动的操作*/
        return {
            flag: true,
            text: "",
        };
    }

    /* TODO: 您还可以在这里添加辅助驱动管理的方法*/
}