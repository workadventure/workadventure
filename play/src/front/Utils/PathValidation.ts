/**
 * Returns true when `waypoint` lands on a colliding tile of `grid`.
 *
 * Waypoints are expressed in the collider-adjusted space used by Character.pathToFollow (their y is
 * shifted up by the body offset), so `waypointYOffset` is added back before mapping to a tile.
 */
export function isWaypointBlocked(
    waypoint: { x: number; y: number },
    grid: number[][],
    tileDimensions: { width: number; height: number },
    waypointYOffset: number,
    colliderTileType: number,
): boolean {
    return (
        grid[Math.floor((waypoint.y + waypointYOffset) / tileDimensions.height)]?.[
            Math.floor(waypoint.x / tileDimensions.width)
        ] === colliderTileType
    );
}
