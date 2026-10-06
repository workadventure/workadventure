export function hasValidViaEntries(content: unknown): boolean {
    if (typeof content !== "object" || content === null) {
        return false;
    }
    const via = Reflect.get(content, "via");
    if (!Array.isArray(via) || via.length === 0) {
        return false;
    }
    return via.every((entry) => typeof entry === "string" && entry.length > 0);
}
