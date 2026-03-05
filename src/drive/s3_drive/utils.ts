/** =========== S3兼容存储 工具类 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import {CONFIG_INFO, SAVING_INFO} from "./metas";

// 简化版AWS Signature V4签名
async function hmacSHA256(key: ArrayBuffer, msg: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey("raw", key, {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
    return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
    let k = await hmacSHA256(new TextEncoder().encode("AWS4" + key).buffer, dateStamp);
    k = await hmacSHA256(k, region);
    k = await hmacSHA256(k, service);
    return await hmacSHA256(k, "aws4_request");
}

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export class HostClouds extends BasicClouds {
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;

    constructor(c: Context, router: string, config: Record<string, any> | any, saving: Record<string, any> | any) {
        super(c, router, config, saving);
        this.config.root_path = (this.config.root_path || "").replace(/^\/|\/$/g, "");
    }

    async initConfig(): Promise<DriveResult> { this.change = true; return {flag: true, text: "初始化成功"}; }
    async loadConfig(): Promise<DriveResult> { return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { return {flag: true, text: ""}; }

    getEndpoint(): string {
        if (this.config.custom_host) return this.config.custom_host.replace(/\/$/, "");
        const ep = this.config.endpoint.replace(/\/$/, "");
        if (this.config.force_path_style || !this.config.bucket) return ep;
        const proto = ep.startsWith("https") ? "https://" : "http://";
        const host = ep.replace(/^https?:\/\//, "");
        return `${proto}${this.config.bucket}.${host}`;
    }

    async signedRequest(method: string, path: string, queryParams?: URLSearchParams, body?: string | ArrayBuffer): Promise<Response> {
        const now = new Date();
        const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0].substring(0, 8);
        const amzDate = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        const region = this.config.region || "us-east-1";
        const endpoint = this.getEndpoint();
        const bucketPath = (this.config.force_path_style && this.config.bucket) ? `/${this.config.bucket}` : "";
        let url = `${endpoint}${bucketPath}${path}`;
        if (queryParams && queryParams.toString()) url += `?${queryParams}`;

        const payloadHash = toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body?.toString() || "")));
        const headers: Record<string, string> = {"Host": new URL(endpoint).host, "X-Amz-Date": amzDate, "X-Amz-Content-Sha256": payloadHash};
        if (this.config.session_token) headers["X-Amz-Security-Token"] = this.config.session_token;

        const sortedHeaders = Object.keys(headers).sort().map(k => `${k.toLowerCase()}:${headers[k]}`).join("\n");
        const signedHeadersList = Object.keys(headers).sort().map(k => k.toLowerCase()).join(";");
        const canonicalRequest = [method, `${bucketPath}${path}`, queryParams?.toString() || "", sortedHeaders + "\n", signedHeadersList, payloadHash].join("\n");
        const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
        const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest)))].join("\n");
        const signingKey = await getSignatureKey(this.config.secret_access_key, dateStamp, region, "s3");
        const signature = toHex(await hmacSHA256(signingKey, stringToSign));
        headers["Authorization"] = `AWS4-HMAC-SHA256 Credential=${this.config.access_key_id}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

        return await fetch(url, {method, headers, body: body || undefined});
    }
}
