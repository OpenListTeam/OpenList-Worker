import { StorageDriver, FileItem } from "../../internal/driver/base";
import { onedriveHostMap, Addition } from "./meta";
import { fileToObj } from "./types";
import {
  refreshToken,
  requestApi,
  getFiles,
  getFile,
  getDrive,
} from "./util";

export class Onedrive implements StorageDriver {
  // Properties mapped from Addition
  root_folder_path: string = "/";
  region: string = "global";
  is_sharepoint: boolean = false;
  use_online_api: boolean = true;
  api_url_address: string = "https://api.oplist.org/onedrive/renewapi";
  client_id: string = "";
  client_secret: string = "";
  redirect_uri: string = "https://api.oplist.org/onedrive/callback";
  refresh_token: string = "";
  site_id: string = "";
  chunk_size: number = 5;
  custom_host: string = "";
  disable_disk_usage: boolean = false;
  enable_direct_upload: boolean = false;

  accessToken: string = "";

  constructor(addition?: Partial<Addition>) {
    if (addition) {
      Object.assign(this, addition);
    }
  }

  async init(): Promise<void> {
    // Normalize types from DB addition which might be strings
    if (typeof this.is_sharepoint === "string") {
      this.is_sharepoint = (this.is_sharepoint as string).toLowerCase() === "true";
    }
    if (typeof this.use_online_api === "string") {
      this.use_online_api = (this.use_online_api as string).toLowerCase() === "true";
    }
    if (typeof this.chunk_size === "string") {
      this.chunk_size = parseInt(this.chunk_size as string) || 5;
    }
    if (typeof this.disable_disk_usage === "string") {
      this.disable_disk_usage = (this.disable_disk_usage as string).toLowerCase() === "true";
    }
    if (typeof this.enable_direct_upload === "string") {
      this.enable_direct_upload = (this.enable_direct_upload as string).toLowerCase() === "true";
    }
    
    if (this.chunk_size < 1) {
      this.chunk_size = 5;
    }
    if (this.refresh_token) {
      await refreshToken(this);
    }
  }

  private getMetaUrl(isAuth: boolean, reqPath: string, suffix?: string): string {
    const hostMap = onedriveHostMap[this.region] || onedriveHostMap["global"];
    if (isAuth) {
      return hostMap.oauth;
    }
    const apiBase = this.is_sharepoint
      ? `${hostMap.api}/v1.0/sites/${this.site_id}`
      : `${hostMap.api}/v1.0/me`;

    const normalized = reqPath.replace(/\\/g, "/");
    if (!normalized || normalized === "/") {
      if (suffix) {
        return `${apiBase}/drive/root/${suffix}`;
      }
      return `${apiBase}/drive/root`;
    }
    let trimmed = normalized.startsWith("/") ? normalized.slice(1) : normalized;
    if (trimmed.endsWith("/")) {
      trimmed = trimmed.slice(0, -1);
    }
    if (!trimmed || trimmed === "") {
      if (suffix) {
        return `${apiBase}/drive/root/${suffix}`;
      }
      return `${apiBase}/drive/root`;
    }
    const encoded = trimmed.split("/").map(encodeURIComponent).join("/");
    if (suffix) {
      return `${apiBase}/drive/root:/${encoded}:/${suffix}`;
    }
    return `${apiBase}/drive/root:/${encoded}`;
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await getFiles(this, physicalPath);
    return files.map((f) => {
      const obj = fileToObj(f, "");
      return {
        name: obj.name,
        size: obj.size,
        is_dir: obj.isFolder,
        modified: obj.modified,
        sign: "",
        type: obj.isFolder ? 1 : 0,
      };
    });
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const f = await getFile(this, physicalPath);
    const obj = fileToObj(f, "");
    return {
      name: obj.name,
      size: obj.size,
      is_dir: obj.isFolder,
      modified: obj.modified,
      sign: "",
      type: obj.isFolder ? 1 : 0,
    };
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const parentPath = physicalPath.split("/").slice(0, -1).join("/") || "/";
    const dirName = physicalPath.split("/").filter(Boolean).pop() || "";
    
    const url = this.getMetaUrl(false, parentPath, "children");
    const data = {
      name: dirName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    };
    await requestApi(this, url, "POST", data);
  }

  async rename(virtualPath: string, physicalPath: string, newName: string): Promise<void> {
    const data = {
      name: newName,
    };
    const url = this.getMetaUrl(false, physicalPath);
    await requestApi(this, url, "PATCH", data);
  }

  async remove(virtualPath: string, physicalPath: string, names: string[]): Promise<void> {
    for (const name of names) {
      const itemPath = physicalPath === "/" ? `/${name}` : `${physicalPath}/${name}`;
      const url = this.getMetaUrl(false, itemPath);
      await requestApi(this, url, "DELETE");
    }
  }

  async move(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void> {
    // Determine the destination parent reference
    // Fetch dstPhys details to get its ID, or construct parentReference path
    const dstUrl = this.getMetaUrl(false, dstPhys);
    const dstRes = await requestApi<any>(this, dstUrl, "GET");
    const dstId = dstRes.id;
    const driveId = dstRes.parentReference?.driveId;

    for (const name of names) {
      const srcItemPath = srcPhys === "/" ? `/${name}` : `${srcPhys}/${name}`;
      const data = {
        parentReference: {
          id: dstId,
          ...(driveId ? { driveId } : {}),
        },
        name,
      };
      const url = this.getMetaUrl(false, srcItemPath);
      await requestApi(this, url, "PATCH", data);
    }
  }

  async copy(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void> {
    const dstUrl = this.getMetaUrl(false, dstPhys);
    const dstRes = await requestApi<any>(this, dstUrl, "GET");
    const dstId = dstRes.id;
    const driveId = dstRes.parentReference?.driveId;

    for (const name of names) {
      const srcItemPath = srcPhys === "/" ? `/${name}` : `${srcPhys}/${name}`;
      const data = {
        parentReference: {
          id: dstId,
          ...(driveId ? { driveId } : {}),
        },
        name,
      };
      const url = this.getMetaUrl(false, srcItemPath, "copy");
      await requestApi(this, url, "POST", data);
    }
  }

  async put(virtualPath: string, physicalPath: string, content: ArrayBuffer | Uint8Array): Promise<void> {
    const dataArray = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
    const length = dataArray.length || dataArray.byteLength;
    if (length <= 4 * 1024 * 1024) {
      // upSmall
      const url = this.getMetaUrl(false, physicalPath, "content");
      await requestApi(this, url, "PUT", dataArray);
    } else {
      // upBig
      const url = this.getMetaUrl(false, physicalPath, "createUploadSession");
      const metadata = { item: { "@microsoft.graph.conflictBehavior": "rename" } };
      const res: any = await requestApi(this, url, "POST", metadata);
      const uploadUrl = res.uploadUrl;
      
      const DEFAULT = this.chunk_size * 1024 * 1024;
      let finish = 0;
      const size = length;
      
      while (finish < size) {
        const left = size - finish;
        const byteSize = Math.min(left, DEFAULT);
        const chunk = dataArray.slice(finish, finish + byteSize);
        
        await fetch(uploadUrl, {
          method: 'PUT',
          body: chunk,
          headers: {
            "Content-Length": byteSize.toString(),
            "Content-Range": `bytes ${finish}-${finish + byteSize - 1}/${size}`
          }
        });
        finish += byteSize;
      }
    }
  }
}
