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

let videoBoxCounter = 0;

export function incrementVideoBoxCounter(): number {
    videoBoxCounter++;
    console.log("Video box counter incremented to:", videoBoxCounter);
    return videoBoxCounter;
}

export function decrementVideoBoxCounter(): number {
    videoBoxCounter--;
    console.log("Video box counter decremented to:", videoBoxCounter);
    return videoBoxCounter;
}
