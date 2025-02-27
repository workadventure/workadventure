export interface InputTagOption {
    value: string;
    label: string;
    created?: boolean;
}

export function toTags(inputTagOptions: InputTagOption[]): string[] {
    return inputTagOptions.map((tag) => tag.value);
}
