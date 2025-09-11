import * as cloud189 from "./cloud189/files"
import * as goodrive from "./goodrive/files"


export const driver_list: Record<string, any> = {
    cloud189: cloud189.HostDriver,
    goodrive: goodrive.HostDriver,
};
