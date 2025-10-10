import {FileInfo} from "../files/FilesObject";

// 加密配置信息 #########################
export interface CryptInfo {
    crypt_name: string  // 加密配置名称
    crypt_user: string  // 加密所有用户
    crypt_pass: string  // 核心加密密码
    crypt_type: number  // 执行加密类型
    crypt_mode: number  // 执行加密模式
    is_enabled: boolean // 是否启用加密
    // 拓展信息 =========================
    crypt_self: boolean // 是否存储密码
    rands_pass: boolean // 是否随机密码
    write_name: string  // 写入后缀名称
    // write_info: string  // 写入后缀名称
    oauth_data: Record<string, any>
}

// 加密模式 #############################
export enum CryptMode {
    ONLY_NAME_NO_ENCRYPT = 0x00,
    ONLY_FILE_AES_VERIFY = 0x01,
    ONLY_NAME_AES_VERIFY = 0x02,
    BOTH_FILE_AES_VERIFY = 0x03,
    ONLY_FILE_XOR_VERIFY = 0x04,
    ONLY_NAME_XOR_VERIFY = 0x05,
    BOTH_FILE_XOR_VERIFY = 0x06,
    ONLY_FILE_XOR_SAVING = 0x07,
    ONLY_NAME_XOR_SAVING = 0x08,
    BOTH_FILE_XOR_SAVING = 0x09,
    ONLY_FILE_C20_VERIFY = 0x0a,
    ONLY_NAME_C20_VERIFY = 0x0b,
    BOTH_FILE_C20_VERIFY = 0x0c,
    ONLY_FILE_C20_SAVING = 0x0d,
    ONLY_NAME_C20_SAVING = 0x0e,
    BOTH_FILE_C20_SAVING = 0x0f,
}