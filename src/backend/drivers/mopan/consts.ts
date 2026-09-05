export const MoPanBaseURL = "https://mcloud.caiyun.feixin.10086.cn"
export const MoPanProxyFamily =
  "https://mcloud.caiyun.feixin.10086.cn/MoPanProxyFamily"

export const DefaultMpVersion = "1.1.202"
export const DefaultPlatform = "android"
export const DefaultOsVersion = "12"
export const DefaultModel = "M2102J2SC"
export const DefaultBrand = "Xiaomi"

export const TaskTypeCopy = 1
export const TaskTypeMove = 2
export const TaskTypeShareSave = 3
export const TaskTypeDelete = 4

export const TaskStatusPending = 1
export const TaskStatusConflict = 2
export const TaskStatusRunning = 3
export const TaskStatusCompleted = 4
export const TaskStatusFailed = 5

export const DefaultChunkSize = 10 * 1024 * 1024 // 10MB
export const DefaultUploadThreads = 3

export function createDefaultDeviceInfo(): string {
  const randomId = () =>
    Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("")

  const deviceInfo = {
    appVersion: "8.0.0",
    brand: DefaultBrand,
    deviceId: randomId(),
    deviceName: DefaultModel,
    imei: randomId(),
    imsi: randomId(),
    mac: Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0"),
    ).join(":"),
    mno: "46000",
    model: DefaultModel,
    mpVersion: DefaultMpVersion,
    networkType: "wifi",
    osVersion: DefaultOsVersion,
    platform: DefaultPlatform,
  }

  return JSON.stringify(deviceInfo)
}
