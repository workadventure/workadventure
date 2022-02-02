export interface OutlineableInterface {
    setFollowOutlineColor(color: number): void;
    removeFollowOutlineColor(): void;
    setApiOutlineColor(color: number): void;
    removeApiOutlineColor(): void;
    pointerOverOutline(): void;
    pointerOutOutline(): void;
    characterCloseByOutline(): void;
    characterFarAwayOutline(): void;
}
