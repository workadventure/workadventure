/**
 * The path every room of the world of roomUrl starts with, e.g. "/@/org/world/" for
 * "https://play.example.com/@/org/world/room". Undefined for a room outside any world, such as a public
 * "/_/global/..." map.
 */
export function getWorldPathPrefix(roomUrl: string): string | undefined {
    const [, at, organization, world] = new URL(roomUrl).pathname.split("/");
    return at === "@" && organization && world ? `/@/${organization}/${world}/` : undefined;
}
