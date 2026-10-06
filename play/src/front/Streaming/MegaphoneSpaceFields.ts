export function getMegaphoneSpaceFields(audienceVideoFeedbackActivated: boolean): string[] {
    const fields = ["screenSharingState", "cameraState", "microphoneState", "megaphoneState"];

    if (audienceVideoFeedbackActivated) {
        fields.push("attendeesState");
    }

    return fields;
}
