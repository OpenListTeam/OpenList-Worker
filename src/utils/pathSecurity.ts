function decodePath(value: string): string | null {
    let decoded = value;
    try {
        for (let i = 0; i < 3; i++) {
            const next = decodeURIComponent(decoded);
            if (next === decoded) break;
            decoded = next;
        }
        return decoded;
    } catch {
        return null;
    }
}

function pathSegments(value: string): string[] | null {
    const decoded = decodePath(value);
    if (decoded === null || decoded.includes('\0') || decoded.includes('\\')) return null;

    const segments = decoded.split('/').filter(Boolean);
    if (segments.some((segment) => segment === '.' || segment === '..')) return null;
    return segments;
}

export function joinPathWithinRoot(root: string, child: string): string | null {
    const rootSegments = pathSegments(root);
    const childSegments = pathSegments(child);
    if (!rootSegments || !childSegments) return null;

    const normalizedRoot = `/${rootSegments.join('/')}`;
    if (child === '/' || childSegments.length === 0) return normalizedRoot || '/';
    return `${normalizedRoot}/${childSegments.join('/')}`;
}
