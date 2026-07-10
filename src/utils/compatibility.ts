export const userAgent =
  typeof window !== "undefined" ? window.navigator.userAgent : ""
export const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent,
  )
export const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)
export const isWechat = /MicroMessenger/i.test(userAgent)
export const isIE = /MSIE|Trident/i.test(userAgent)
export const isMac = (window?.navigator?.platform ?? "")?.includes("Mac")
export const getPlatform = () => {
  const ua = userAgent
  const platform = window?.navigator?.platform ?? ""

  // The order of checks is important.
  if (/android/i.test(ua)) {
    return "Android"
  }

  // iOS check for iPhone, iPod, and iPad (including modern iPads reporting as Mac).
  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform.includes("Mac") && navigator.maxTouchPoints > 1)
  ) {
    return "iOS"
  }

  if (/windows/i.test(ua)) {
    return "Windows"
  }

  if (/macintosh|mac os x/i.test(ua)) {
    return "MacOS"
  }

  if (/linux/i.test(ua)) {
    return "Linux"
  }

  return "Unknown"
}
