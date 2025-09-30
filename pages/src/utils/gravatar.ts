import CryptoJS from 'crypto-js';

/**
 * 生成Gravatar头像URL
 * @param email 用户邮箱
 * @param size 头像大小，默认80px
 * @param defaultImage 默认头像类型，可选值：404, mp, identicon, monsterid, wavatar, retro, robohash, blank
 * @returns Gravatar头像URL
 */
export function getGravatarUrl(
    email: string, 
    size: number = 80, 
    defaultImage: string = 'identicon'
): string {
    if (!email) {
        return `https://www.gravatar.com/avatar/00000000000000000000000000000000?s=${size}&d=${defaultImage}`;
    }

    // 将邮箱转换为小写并去除空格
    const trimmedEmail = email.trim().toLowerCase();
    
    // 生成MD5哈希
    const hash = CryptoJS.MD5(trimmedEmail).toString();
    
    // 构建Gravatar URL
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
}

/**
 * 获取用户头像URL，优先使用用户自定义头像，否则使用Gravatar
 * @param user 用户信息
 * @param size 头像大小
 * @returns 头像URL
 */
export function getUserAvatarUrl(
    user: { email?: string; avatar?: string }, 
    size: number = 80
): string {
    // 如果用户有自定义头像，优先使用
    if (user.avatar && user.avatar.trim()) {
        return user.avatar;
    }
    
    // 否则使用Gravatar
    return getGravatarUrl(user.email || '', size);
}

/**
 * 预加载头像图片
 * @param url 头像URL
 * @returns Promise，成功时返回图片URL，失败时返回默认头像URL
 */
export function preloadAvatar(url: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => {
            // 如果加载失败，返回默认头像
            resolve(getGravatarUrl('', 80, 'identicon'));
        };
        img.src = url;
    });
}