let livekitVideoCounter = 0;

export function incrementLivekitVideoCounter(): number {
    livekitVideoCounter++;
    console.log("Livekit video counter incremented to:", livekitVideoCounter);
    return livekitVideoCounter;
}

export function decrementLivekitVideoCounter(): number {
    livekitVideoCounter--;
    console.log("Livekit video counter decremented to:", livekitVideoCounter);
    return livekitVideoCounter;
}
