// Paste in the DevTools console of a WorkAdventure tab (Chrome), then turn your camera off and on so that
// WorkAdventure asks for it through this relay. Then:
//   freezeCamera()    the camera freezes once: asking for it again gives a working one (automatic restart)
//   holdCameraBack()  the system keeps the camera (locked session): frozen, and getUserMedia never answers
//   releaseCamera()   the system gives the camera back: "Try again" works
(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const cameras = [];
    let heldBack = false;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (heldBack && constraints?.video) {
            return new Promise(() => {});
        }
        const stream = await original(constraints);
        const source = stream.getVideoTracks()[0];
        if (!source) {
            return stream;
        }
        const camera = { frozen: false };
        cameras.push(camera);
        const generator = new MediaStreamTrackGenerator({ kind: "video" });
        new MediaStreamTrackProcessor({ track: source }).readable
            .pipeThrough(
                new TransformStream({
                    transform(frame, controller) {
                        if (camera.frozen) {
                            frame.close();
                        } else {
                            controller.enqueue(frame);
                        }
                    },
                }),
            )
            .pipeTo(generator.writable)
            .catch(() => {});
        const stopGenerator = generator.stop.bind(generator);
        generator.stop = () => {
            source.stop();
            stopGenerator();
        };
        return new MediaStream([generator, ...stream.getAudioTracks()]);
    };
    window.freezeCamera = () => cameras.forEach((camera) => (camera.frozen = true));
    window.holdCameraBack = () => {
        heldBack = true;
        window.freezeCamera();
    };
    window.releaseCamera = () => {
        heldBack = false;
    };
    console.log("Turn your camera off and on, then call freezeCamera() or holdCameraBack()");
})();
