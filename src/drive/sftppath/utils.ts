/** =========== SFTP 工具类 ================
 * 注意：SFTP在边缘运行时(Cloudflare Workers等)无法直接使用，需要通过代理服务
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import {CONFIG_INFO, SAVING_INFO} from "./metas";
import * as con from "./const";

export class HostClouds extends BasicClouds {
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;

    constructor(c: Context, router: string, config: Record<string, any> | any, saving: Record<string, any> | any) {
        super(c, router, config, saving);
        if (!this.config.port) this.config.port = con.DEFAULTS.PORT;
        if (!this.config.root_path) this.config.root_path = con.DEFAULTS.ROOT_PATH;
    }

    async initConfig(): Promise<DriveResult> {
        if (!this.config.address) return {flag: false, text: "SFTP地址不能为空"};
        if (!this.config.username) return {flag: false, text: "SFTP用户名不能为空"};
        this.change = true;
        return {flag: true, text: "初始化成功（SFTP需要Node.js环境支持）"};
    }

    async loadConfig(): Promise<DriveResult> { return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { return {flag: true, text: ""}; }

    // SFTP操作需要在Node.js环境下通过ssh2库实现
    // 在边缘运行时中，需要通过API代理来实现SFTP操作
    getConnectionInfo(): Record<string, any> {
        return { host: this.config.address, port: this.config.port, username: this.config.username, password: this.config.password, privateKey: this.config.private_key, passphrase: this.config.passphrase };
    }
}
