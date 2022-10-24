export interface OutlineableInterface {
    setFollowOutlineColor(color: number): void;
    removeFollowOutlineColor(): void;
    setApiOutlineColor(color: number): void;
    removeApiOutlineColor(): void;
    pointerOverOutline(color: number): void;
    pointerOutOutline(): void;
    characterCloseByOutline(color: number): void;
    characterFarAwayOutline(): void;
}
