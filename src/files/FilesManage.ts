import {Context} from "hono";
import {MountManage} from "../mount/MountManage";
import {FileType} from "./FilesObject";
import {MatesManage} from "../mates/MatesManage";
import {PathRuleService, PathRule} from "../mates/PathRuleService";
import {UsersManage} from "../users/UsersManage";

export class FilesManage {
    public c: Context
    public d: any | null

    constructor(c: Context, d?: any) {
        this.c = c
        this.d = d
    }

    /**
     * 获取当前用户角色（用于路径规则权限检查）
     */
    private async getUserRole(originalSource: string, rules: PathRule[]): Promise<'owner' | 'group' | 'other'> {
        try {
            // 从上下文获取用户信息
            const user = this.c.get('user');
            if (!user) return 'other'; // 未登录用户

            // 检查是否为管理员
            if (user.users_mask && (user.users_mask.includes('admin') || user.users_mask === '1')) {
                return 'owner';
            }
            if (user.users_name === 'admin') {
                return 'owner';
            }

            // 查找匹配的路径规则，检查是否为文件所有者
            const rule = PathRuleService.matchRule(originalSource, rules);
            if (rule && rule.mates_user) {
                // TODO: 将 mates_user (number) 与当前用户ID比较
                // 目前简单处理：登录用户为 group 角色
                return 'group';
            }

            return 'group'; // 登录用户默认为 group 角色
        } catch (error) {
            return 'other';
        }
    }

    /**
     * 加载所有启用的路径规则
     */
    private async loadPathRules(): Promise<PathRule[]> {
        try {
            const matesManage = new MatesManage(this.c);
            const result = await matesManage.getEnabledMates();
            if (result.flag && result.data) {
                return result.data.map(m => ({
                    mates_name: m.mates_name,
                    mates_mask: m.mates_mask,
                    mates_user: m.mates_user,
                    is_enabled: m.is_enabled,
                    dir_hidden: m.dir_hidden || 0,
                    dir_shared: m.dir_shared || 0,
                    set_zipped: m.set_zipped ? JSON.parse(m.set_zipped) : null,
                    set_parted: m.set_parted ? JSON.parse(m.set_parted) : null,
                    crypt_name: m.crypt_name || '',
                    cache_time: m.cache_time || 0,
                }));
            }
        } catch (error) {
            console.error("加载路径规则失败:", error);
        }
        return [];
    }

    /**
     * 检查操作权限
     */
    private checkActionPermission(
        action: string,
        originalSource: string,
        rules: PathRule[],
        userRole: 'owner' | 'group' | 'other'
    ): boolean {
        const rule = PathRuleService.matchRule(originalSource, rules);
        if (!rule) return true; // 没有规则则允许

        switch (action) {
            case 'list':
            case 'link':
                return PathRuleService.checkPermission(rule.mates_mask, 'download', userRole);
            case 'copy':
            case 'create':
            case 'upload':
            case 'rename':
                return PathRuleService.checkPermission(rule.mates_mask, 'write', userRole);
            case 'move':
                return PathRuleService.checkPermission(rule.mates_mask, 'write', userRole)
                    && PathRuleService.checkPermission(rule.mates_mask, 'delete', userRole);
            case 'remove':
                return PathRuleService.checkPermission(rule.mates_mask, 'delete', userRole);
            default:
                return true;
        }
    }

    async action(action?: string | undefined,
                 source?: string | undefined,
                 target?: string | undefined,
                 config?: Record<string, any> | undefined,
                 driver?: string | undefined,
                 upload?: { [key: string]: any } | undefined): Promise<any> {
        // 保存原始路径（用于路径规则匹配）
        const originalSource = source || '/';

        // 加载路径规则 ======================================================================
        const pathRules = await this.loadPathRules();
        const userRole = await this.getUserRole(originalSource, pathRules);

        // 权限检查 ==========================================================================
        if (action && !this.checkActionPermission(action, originalSource, pathRules, userRole)) {
            return this.c.json({flag: false, text: '权限不足，无法执行此操作'}, 403);
        }

        // 检查路径是否被隐藏（非管理员不能访问隐藏路径）
        if (action && action !== 'list') {
            const rule = PathRuleService.matchRule(originalSource, pathRules);
            if (rule && PathRuleService.isHidden(rule) && userRole !== 'owner') {
                return this.c.json({flag: false, text: '404 NOT FOUND'}, 404);
            }
        }

        // 检查参数 ==========================================================================
        console.log("@action before", action, source, target, config)
        let mount_data: MountManage = new MountManage(this.c);
        let drive_load: any = await mount_data.loader(source, action == "list", action == "list");
        if (!drive_load) return this.c.json({flag: false, text: '404 NOT FOUND'}, 404)

        // 检查drive_load[0]是否为null（没有匹配的挂载点）
        const has_main_mount = drive_load[0] !== null;

        if (has_main_mount) {
            let drive_text: any = await drive_load[0].loadSelf();
            console.log("@action driver core", source, drive_load[0].router)
            console.log("@action driver text", drive_text, drive_load[0].change)
            source = source?.replace(drive_load[0].router, '') || "/"
            console.log("@action source after", source, drive_load[0].router)
            target = target?.replace(drive_load[0].router, '') || "/"
            console.log("@action target after", target, drive_load[0].router)
            console.log("@action target after", action, source, target, drive_load.downFile)
        } else {
            console.log("@action target error",
                "没有匹配的主挂载点，只显示子挂载点")
        }
        // 执行操作 ==========================================================================
        switch (action) {
case "list": { // 列出文件 =======================================================
                let file_list: any[] = [];

                // 获取当前目录的文件列表 ====================================================
                let realFileCount = 0;
                if (has_main_mount) {
                    const path_info = await drive_load[0].listFile({path: source})
                    if (path_info && path_info.fileList) {
                        file_list = file_list.concat(path_info.fileList);
                        realFileCount = path_info.pageSize || path_info.fileList.length;
                    }
                }

                // 获取所有子目录挂载点 ======================================================
                let subMountCount = 0;
                for (let i = 1; i < drive_load.length; i++) {
                    const sub_driver = drive_load[i];
                    let relative_path: string;

                    if (has_main_mount) {
                        // 有主挂载点：计算相对路径
                        relative_path = drive_load[0].router === '/'
                            ? sub_driver.router.substring(1)
                            : sub_driver.router.substring(drive_load[0].router.length).replace(/^\//, '');
                    } else {
                        // 没有主挂载点：去掉开头的/，只保留第一级路径
                        const path_without_slash = sub_driver.router.substring(1); // 去掉开头的/
                        const first_slash_index = path_without_slash.indexOf('/');
                        relative_path = first_slash_index > 0
                            ? path_without_slash.substring(0, first_slash_index)
                            : path_without_slash;
                    }

                    console.log("@action sub_driver:", sub_driver.router, "=>", relative_path)
                    file_list.push({
                        filePath: source || "/",
                        fileName: relative_path,
                        fileSize: 0, fileType: 0,
                        fileUUID: "", fileHash: {},
                        timeModify: new Date(),
                        timeCreate: new Date()
                    });
                    subMountCount++;
                }

                // 应用路径规则过滤（隐藏文件、权限检查） ====================================
                if (pathRules.length > 0) {
                    file_list = PathRuleService.filterFileList(
                        file_list, originalSource, pathRules, userRole
                    );
                }

                // 为加密路径的文件添加加密标记 ==============================================
                for (const file of file_list) {
                    const filePath = originalSource === '/'
                        ? `/${file.fileName}`
                        : `${originalSource}/${file.fileName}`;
                    const cryptName = PathRuleService.getCryptConfig(filePath, pathRules);
                    if (cryptName) {
                        file.fileCrypts = {
                            crypt_name: cryptName,
                            is_encrypted: true,
                        };
                    }
                }

                // 修复：正确的文件数量应该是过滤后的文件数
                const totalFileCount = file_list.length;
                
                return this.c.json({
                    flag: true, text: 'Success', data: {
                        pageSize: totalFileCount,
                        filePath: originalSource || "/",
                        fileList: file_list
                    }
                })
            }
case "link": { // 获取链接 =======================================================
                // 检查加密：如果文件在加密路径下，需要验证密码
                const cryptName = PathRuleService.getCryptConfig(originalSource, pathRules);
                if (cryptName) {
                    // 检查请求中是否提供了加密密码
                    const cryptPass = config?.crypt_pass || this.c.req.header('X-Crypt-Pass');
                    if (!cryptPass) {
                        return this.c.json({
                            flag: false,
                            text: '此文件已加密，请提供解密密码',
                            data: { need_crypt_pass: true, crypt_name: cryptName }
                        }, 403);
                    }
                    // TODO: 验证密码是否正确
                }

                const file_links = await drive_load[0].downFile({path: source})
                
				// 检查是否有流式下载
				if (file_links && file_links.length > 0 && file_links[0].stream) {
					try {
						console.log('开始流式下载处理');
						const streamResult = await file_links[0].stream(this.c);
						if (streamResult instanceof ReadableStream) {
							console.log('返回ReadableStream响应');
							const headersObj: Record<string, string> = {};
							if (this.c.res.headers) {
								this.c.res.headers.forEach((value: string, key: string) => {
									headersObj[key] = value;
								});
							}
							return this.c.body(streamResult, 200, headersObj);
						}
						return this.c.json({flag: false, text: '流式下载未返回有效流'}, 500);
					} catch (error: any) {
						console.error('Stream download error:', error);
						return this.c.json({flag: false, text: error.message || '流式下载失败'}, 500);
					}
				} else {
					return this.c.json({flag: true, text: 'Success', data: file_links})
				}
			}
            case "copy": { // 复制文件 =======================================================
                console.log("@action", "copy", source, target)
                const copyFileName = source?.includes('/')
                    ? source.substring(source.lastIndexOf('/') + 1)
                    : source || ''
                const copyDestPath = target === '/' ? `/${copyFileName}` : `${target}/${copyFileName}`
                console.log("@action copy dest:", copyDestPath)
                const task_result = await drive_load[0].copyFile({path: source}, {path: copyDestPath})
                return this.c.json({flag: true, text: 'Success', data: task_result})
            }
            case "move": { // 移动文件 =======================================================
                console.log("@action", "moveFile", source, target)
                const moveFileName = source?.includes('/')
                    ? source.substring(source.lastIndexOf('/') + 1)
                    : source || ''
                const moveDestPath = target === '/' ? `/${moveFileName}` : `${target}/${moveFileName}`
                console.log("@action move dest:", moveDestPath)
                const task_result = await drive_load[0].moveFile({path: source}, {path: moveDestPath})
                return this.c.json({flag: true, text: 'Success', data: task_result})
            }
            case "rename": { // 重命名文件 ===================================================
                if (!target) return this.c.json({flag: false, text: 'Invalid Target'}, 400)
                const parentDir = source?.includes('/')
                    ? source.substring(0, source.lastIndexOf('/')) || '/'
                    : '/'
                const destPath = parentDir === '/' ? `/${target}` : `${parentDir}/${target}`
                console.log("@action", "renameFile", source, "=>", destPath)
                const rename_result = await drive_load[0].moveFile({path: source}, {path: destPath})
                return this.c.json({flag: true, text: 'Success', data: rename_result})
            }
            case "create": { // 创建对象 =====================================================
                if (!target) return this.c.json({flag: false, text: 'Invalid Target'}, 400)
                const create_result = await drive_load[0].makeFile(
                    {path: source},
                    target,
                    target.endsWith("/") ? FileType.F_DIR : FileType.F_ALL)
                if (create_result && !create_result.flag) {
                    return this.c.json({flag: false, text: create_result.text}, 400)
                }
                return this.c.json({flag: true, text: 'Success', data: create_result})
            }
            case "remove": { // 删除对象 =====================================================
                const task_result = await drive_load[0].killFile({path: source})
                return this.c.json({flag: true, text: 'Success', data: task_result})
            }
            case "upload": { // 上传文件 =====================================================
                if (!upload || !upload["files"])
                    return this.c.json({flag: false, text: 'Invalid Target'}, 400)
                const upload_result = await drive_load[0].pushFile(
                    {path: source}, upload["files"].name, FileType.F_ALL, upload["files"])
                return this.c.json({flag: true, text: 'Success', data: upload_result})
            }
            default: { // 默认应输出错误 =====================================================
                return this.c.json({flag: false, text: 'Invalid Action'}, 400)
            }
        }
    }
}