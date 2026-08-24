import {
  OnedriveSharelinkAddition,
  OnedriveShareItem,
  SharePointListDataResp,
} from "./types"

export class OnedriveSharelinkApiClient {
  private addition: OnedriveSharelinkAddition
  private finalUrl = ""
  private cookie = ""

  constructor(addition: OnedriveSharelinkAddition) {
    this.addition = addition
  }

  async init(): Promise<void> {
    if (!this.addition.url) {
      throw new Error("OneDrive Sharelink URL is required")
    }

    // Resolve short links (like 1drv.ms)
    try {
      const res = await fetch(this.addition.url, {
        method: "HEAD",
        redirect: "follow",
      })
      this.finalUrl = res.url || this.addition.url
    } catch {
      this.finalUrl = this.addition.url
    }
  }

  async getFiles(folderPath = "/"): Promise<OnedriveShareItem[]> {
    if (!this.finalUrl) {
      await this.init()
    }

    const u = new URL(this.finalUrl)
    // For single file shared links
    if (
      u.pathname.includes("/:u:/") ||
      u.pathname.includes("/:v:/") ||
      u.pathname.includes("/:b:/")
    ) {
      const fileName = decodeURIComponent(u.pathname.split("/").pop() || "file")
      return [
        {
          id: "root_file",
          name: fileName,
          size: 0,
          is_folder: false,
          modified: new Date().toISOString(),
          download_url: this.getDirectDownloadLink(this.finalUrl),
        },
      ]
    }

    // Attempt SharePoint renderListDataAsStream
    try {
      const apiUrl = `${u.origin}${u.pathname}/_api/web/GetListUsingPath(DecodedUrl=@a1)/renderListDataAsStream`
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/json;odata=verbose",
        },
        body: JSON.stringify({
          parameters: {
            RenderOptions: 5707,
            AllowMultipleValueFilterForTaxonomyFields: true,
            AddRequiredFields: true,
          },
        }),
      })

      if (res.ok) {
        const data = (await res.json()) as SharePointListDataResp
        const rows = data.ListData?.Row || []
        return rows.map((r) => {
          const isDir = String(r.FSObjType) === "1"
          const sizeNum = parseInt(r.File_x0020_Size || "0", 10)
          return {
            id: r.UniqueId,
            name: r.FileLeafRef,
            size: isDir ? 0 : isNaN(sizeNum) ? 0 : sizeNum,
            is_folder: isDir,
            modified: r["Modified."] || new Date().toISOString(),
            download_url: r["@content.downloadUrl"],
            sp_item_url: r[".spItemUrl"],
          }
        })
      }
    } catch {
      // Fallback
    }

    return []
  }

  getDirectDownloadLink(url: string): string {
    const u = new URL(url)
    u.searchParams.set("download", "1")
    return u.toString()
  }
}
