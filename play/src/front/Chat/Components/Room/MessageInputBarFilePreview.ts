export interface MessageInputBarFilePreview {
    id: string;
    size: number;
    name: string;
    type: string;
    url: FileReader["result"] | undefined;
    preparing: boolean;
}

export function createFilePreview(file: { id: string; file: File }): MessageInputBarFilePreview {
    return {
        id: file.id,
        name: file.file.name,
        type: file.file.type,
        size: file.file.size,
        url: undefined,
        preparing: file.file.type.includes("image"),
    };
}

export function completeFilePreview(
    previews: MessageInputBarFilePreview[],
    id: string,
    url: FileReader["result"] | undefined,
): MessageInputBarFilePreview[] {
    let previewFound = false;
    const updatedPreviews = previews.map((preview) => {
        if (preview.id !== id) {
            return preview;
        }

        previewFound = true;
        return {
            ...preview,
            url,
            preparing: false,
        };
    });

    return previewFound ? updatedPreviews : previews;
}

export function removeFilePreviews(
    previews: MessageInputBarFilePreview[],
    idsToRemove: readonly string[],
): MessageInputBarFilePreview[] {
    return previews.filter((preview) => !idsToRemove.includes(preview.id));
}
