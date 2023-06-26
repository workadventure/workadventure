/**
 * Computes a "short URL" hash of the string passed in parameter.
 */
function shortHash(s: string): string {
    let hash = 0;
    const strLength = s.length;
    if (strLength === 0) {
        return "";
    }
    for (let i = 0; i < strLength; i++) {
        const c = s.charCodeAt(i);
        hash = (hash << 5) - hash + c;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

export { shortHash };
