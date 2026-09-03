const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata.google.internal.',
]);

function parseIpv4(hostname: string): number[] | null {
    const parts = hostname.split('.');
    if (parts.length !== 4) return null;
    const octets = parts.map((part) => Number(part));
    if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
    return octets;
}

function isBlockedIpv4(octets: number[]): boolean {
    const [a, b] = octets;
    return a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 0) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19)) ||
        a >= 224;
}

function isBlockedIpv6(hostname: string): boolean {
    const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!host.includes(':')) return false;
    if (host === '::' || host === '::1') return true;
    if (host.startsWith('fc') || host.startsWith('fd') || /^fe[89ab]/.test(host)) return true;

    const mappedIpv4 = host.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    return mappedIpv4 ? isBlockedIpv4(parseIpv4(mappedIpv4) || []) : false;
}

export function isSafeUpstreamUrl(rawUrl: string): boolean {
    try {
        const url = new URL(rawUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
        if (url.username || url.password) return false;

        const hostname = url.hostname.toLowerCase();
        if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
            return false;
        }

        const ipv4 = parseIpv4(hostname);
        if (ipv4 && isBlockedIpv4(ipv4)) return false;
        return !isBlockedIpv6(hostname);
    } catch {
        return false;
    }
}

export async function fetchUpstream(rawUrl: string, init: RequestInit = {}): Promise<Response> {
    if (!isSafeUpstreamUrl(rawUrl)) throw new Error('不允许访问本地或私有网络地址');

    const response = await fetch(rawUrl, { ...init, redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
        throw new Error('上游重定向已被拒绝');
    }
    return response;
}
