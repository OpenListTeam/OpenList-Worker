import { Onedrive } from "./driver";
import { File, Files, Metadata, DriveResp, Host } from "./types";
import { onedriveHostMap } from "./meta";
import axios from "axios";

export async function refreshToken(d: Onedrive): Promise<void> {
  // Use online API
  if (d.use_online_api && d.api_url_address) {
    const resp = await axios.get(d.api_url_address, {
      params: {
        refresh_ui: d.refresh_token,
        server_use: "true",
        driver_txt: "onedrive_pr",
      },
    });
    const data = resp.data;
    if (!data.refresh_token || !data.access_token) {
      if (data.text) {
        throw new Error(`failed to refresh token: ${data.text}`);
      }
      throw new Error("empty token returned from official API");
    }
    d.accessToken = data.access_token;
    d.refresh_token = data.refresh_token;
    return;
  }

  // Use local client
  if (!d.client_id || !d.client_secret) {
    throw new Error("empty ClientID or ClientSecret");
  }

  const hostMap = onedriveHostMap[d.region] || onedriveHostMap["global"];
  const url = `${hostMap.oauth}/common/oauth2/v2.0/token`;

  const resp = await axios.post(
    url,
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: d.client_id,
      client_secret: d.client_secret,
      redirect_uri: d.redirect_uri,
      refresh_token: d.refresh_token,
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const data = resp.data;
  if (!data.refresh_token) {
    throw new Error("Empty token");
  }
  d.refresh_token = data.refresh_token;
  d.accessToken = data.access_token;
}

export async function requestApi<T>(
  d: Onedrive,
  url: string,
  method: string,
  data?: any,
  noRetry?: boolean
): Promise<T> {
  try {
    const res = await axios({
      url,
      method,
      data,
      headers: {
        Authorization: `Bearer ${d.accessToken}`,
      },
    });
    return res.data;
  } catch (error: any) {
    const errData = error.response?.data?.error;
    if (errData?.code === "InvalidAuthenticationToken" && !noRetry) {
      await refreshToken(d);
      return requestApi(d, url, method, data, true);
    }
    throw new Error(errData?.message || error.message);
  }
}

function cleanSubPath(p: string): string {
  if (!p || p === "/") return "/drive/root";
  const trimmed = p.startsWith("/") ? p.slice(1) : p;
  return `/drive/root:/${trimmed}`;
}

export function buildUrl(api: string, reqPath: string, suffix?: string): string {
  if (!reqPath || reqPath === "/") {
    if (suffix) {
      return `${api}/drive/root/${suffix}`;
    }
    return `${api}/drive/root`;
  }
  let trimmed = reqPath.startsWith("/") ? reqPath.slice(1) : reqPath;
  if (trimmed.endsWith("/")) {
    trimmed = trimmed.slice(0, -1);
  }
  if (!trimmed || trimmed === "") {
    if (suffix) {
      return `${api}/drive/root/${suffix}`;
    }
    return `${api}/drive/root`;
  }
  if (suffix) {
    return `${api}/drive/root:/${trimmed}:/${suffix}`;
  }
  return `${api}/drive/root:/${trimmed}`;
}

export async function getFiles(d: Onedrive, reqPath: string): Promise<File[]> {
  const hostMap = onedriveHostMap[d.region] || onedriveHostMap["global"];
  const apiBase = d.is_sharepoint
    ? `${hostMap.api}/v1.0/sites/${d.site_id}`
    : `${hostMap.api}/v1.0/me`;
  
  const childrenUrl = buildUrl(apiBase, reqPath, "children");
  let nextLink: string | undefined = `${childrenUrl}?$top=1000&$expand=thumbnails($select=medium)&$select=id,name,size,fileSystemInfo,content.downloadUrl,file,parentReference`;

  const res: File[] = [];
  while (nextLink) {
    const files: Files = await requestApi(d, nextLink, "GET");
    if (files.value) {
      res.push(...files.value);
    }
    nextLink = files["@odata.nextLink"];
  }
  return res;
}

export async function getFile(d: Onedrive, reqPath: string): Promise<File> {
  const hostMap = onedriveHostMap[d.region] || onedriveHostMap["global"];
  const apiBase = d.is_sharepoint
    ? `${hostMap.api}/v1.0/sites/${d.site_id}`
    : `${hostMap.api}/v1.0/me`;
  
  const url = buildUrl(apiBase, reqPath);
  return requestApi<File>(d, url, "GET");
}

export function toAPIMetadata(modTime: Date | null, createTime: Date | null): Metadata {
  const metadata: Metadata = {
    fileSystemInfo: {},
  };
  if (modTime) {
    metadata.fileSystemInfo!.lastModifiedDateTime = modTime.toISOString();
  }
  if (createTime) {
    metadata.fileSystemInfo!.createdDateTime = createTime.toISOString();
  }
  if (!createTime && modTime) {
    metadata.fileSystemInfo!.createdDateTime = modTime.toISOString();
  }
  return metadata;
}

export async function updateMetadata(d: Onedrive, reqPath: string, metadata: Metadata): Promise<void> {
  const hostMap = onedriveHostMap[d.region] || onedriveHostMap["global"];
  const apiBase = d.is_sharepoint
    ? `${hostMap.api}/v1.0/sites/${d.site_id}`
    : `${hostMap.api}/v1.0/me`;
  
  const url = buildUrl(apiBase, reqPath);
  await requestApi(d, url, "PATCH", metadata);
}

export async function getDrive(d: Onedrive): Promise<DriveResp> {
  const hostMap = onedriveHostMap[d.region] || onedriveHostMap["global"];
  let api = "";
  if (d.is_sharepoint) {
    api = `${hostMap.api}/v1.0/sites/${d.site_id}/drive`;
  } else {
    api = `${hostMap.api}/v1.0/me/drive`;
  }
  return requestApi<DriveResp>(d, api, "GET", undefined, true);
}

export async function getDirectUploadInfo(d: Onedrive, reqPath: string) {
  const hostMap = onedriveHostMap[d.region] || onedriveHostMap["global"];
  const apiBase = d.is_sharepoint
    ? `${hostMap.api}/v1.0/sites/${d.site_id}`
    : `${hostMap.api}/v1.0/me`;
  
  const url = buildUrl(apiBase, reqPath, "createUploadSession");

  const metadata = {
    item: {
      "@microsoft.graph.conflictBehavior": "rename",
    },
  };
  const res: any = await requestApi(d, url, "POST", metadata);
  const uploadUrl = res.uploadUrl;
  if (!uploadUrl) {
    throw new Error("failed to get upload URL from response");
  }
  return {
    UploadURL: uploadUrl,
    ChunkSize: d.chunk_size * 1024 * 1024,
    Method: "PUT",
  };
}
