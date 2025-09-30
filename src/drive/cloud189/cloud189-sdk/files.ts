import { Cloud189Client } from "./client";
import { ArrayUtil } from "@netdisk-sdk/utils";
import { IBoolean, ITime, ITime2, ITimestampMS, IFileListQueryParam, IFileListResult, DeepStringify } from "./types";
import { WebURL } from "./const";

export class Cloud189SharedFSApi {
    client: Cloud189Client;
    constructor(client: Cloud189Client) {
        this.client = client
    }


    async getFileDownloadUrl(params: DeepStringify<IGetFileDownloadUrlParam>): Promise<string> {
        const { body: { fileDownloadUrl } } = await this.client.agent
            .get(`${WebURL}/api/open/file/getFileDownloadUrl.action`)
            .query({ dt: 1, ...params })
        return fileDownloadUrl
    }

    // async listShareDirByShareIdAndFileId(params: IShareQueryParam) {
    //     const { data } = await this.get<IFileListResult<IShareFile, IShareFolder>>(
    //         '/v2/listShareDirByShareIdAndFileId.action',
    //         {
    //             shareDirFileId: params.fileId,
    //             ...params
    //         },{
    //             baseURL:WebURL
    //         }
    //     )
    //     return data
    // }

    /**
     * 列出分享目录
     * @param params 
     * @returns 
     */
    async listShareDir(params: DeepStringify<IShareQueryParam>): Promise<IFileListResult<IShareFile, IShareFolder>> {
        const { body } = await this.client.agent
            .get(`${WebURL}/api/open/share/listShareDir.action`,)
            .query({
                'sign-type': 1,
                shareDirFileId: params.fileId,
                ...params
            })
        return body
    }
    async *listShareDirIter(params: IShareQueryParam) {
        let [pageNum = 1, pageSize = 100, fileId] = [Number(params.pageNum), Number(params.pageSize), String(params.fileId)]
        let fileListAO: IFileListResult<IShareFile, IShareFolder>['fileListAO']
        do {
            const result = await this.listShareDir({ ...params, fileId, pageNum: pageNum++, pageSize })
            fileListAO = result.fileListAO

            if (fileListAO.folderList) yield* fileListAO.folderList
            if (fileListAO.fileList) yield* fileListAO.fileList

        } while (ArrayUtil.arrayLengthCount(fileListAO.fileList, fileListAO.folderList) >= pageSize)
    }

    /**
     * 获取分享的文件信息
     * @param shareCode 
     * @returns 
     */
    async getShareInfoByCode(shareCode: string): Promise<IShareInfoByCode> {
        const { body } = await this.client.agent
            .get(`${WebURL}/api/open/share/getShareInfoByCode.action`,)
            .query({ shareCode })
        return body
    }

    /**
     * 获取分享的文件信息
     * @param shareCode 
     * @returns 
     */
    async getShareInfoByCodeV2(shareCode: string): Promise<IShareInfoByCode> {
        const { body } = await this.client.agent
            .get(`${WebURL}/api/open/share/getShareInfoByCodeV2.action`,)
            .query({ shareCode })
        return body
    }

    /**
     * 验证提取码是否正确
     * @param shareCode 
     * @param accessCode 
     * @returns 
     */
    async checkAccessCode(shareCode: string, accessCode: string) {
        const { body: { shareId } } = await this.client.agent
            .get(`${WebURL}/api/open/share/checkAccessCode.action`,)
            .query({ shareCode, accessCode })
        return Boolean(shareId)
    }
}

export interface IShareInfoByCode {
    accessCode: string,
    /** 分享者信息 */
    creator: {
        /** 头像地址 */
        iconURL: string,
        oper: boolean,
        /** 用户名 */
        ownerAccount: string,
        superVip: number,
        vip: number
    },

    /**
     * 有效时间(时间戳ms)
     */
    expireTime: ITimestampMS,
    expireType: number,

    /** 文件创建时间 */
    fileCreateDate: ITime,
    /** 文件修改时间 */
    fileLastOpTime: ITime,
    /** 文件ID */
    fileId: string,
    /** 文件名称 */
    fileName: string,
    /** 文件大小 */
    fileSize: number,
    /** 文件类型(后缀) */
    fileType: string,
    isFolder: boolean,
    /** 是否需要提取码 */
    needAccessCode: IBoolean,
    reviewStatus: number,
    /** 分享时间(时间戳ms)  */
    shareDate: ITimestampMS,
    shareId: number,
    shareMode: number,
    shareType: number
}

export interface IShareQueryParam extends IFileListQueryParam {
    accessCode: string,
    shareId: number,
    shareMode: number,
};

export interface IShareFile {
    id: string
    name: string
    md5: string
    size: number
    createDate: ITime
    lastOpTime: ITime

    fileCata: number
    /** 文件媒体类型， 1：图片 2：音乐 3：视频 4：文档 */
    mediaType: number
    rev: ITime2
    starLabel: number
}

export interface IShareFolder {
    id: string,
    name: string,
    createDate: ITime,
    lastOpTime: ITime,

    fileListSize: number
    parentId: string

    fileCata: number
    rev: ITime2
    starLabel: number
}

export interface IGetFileDownloadUrlParam {
    fileId: string,
    shareId: number,
    /** 未知参数，会改变下载链接 */
    dt?: number,
}