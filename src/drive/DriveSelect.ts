import * as cloud189 from "./cloud189/files"
import * as goodrive from "./goodrive/files"
import * as cloud189_metas from "./cloud189/metas"
import * as goodrive_metas from "./goodrive/metas"

export const driver_list: Record<string, any> = {
    cloud189: cloud189.HostDriver,
    goodrive: goodrive.HostDriver,
};



export const config_list: Record<string, any> = {
    cloud189: cloud189_metas.CONFIG_INFO,
    goodrive: goodrive_metas.CONFIG_INFO,
};