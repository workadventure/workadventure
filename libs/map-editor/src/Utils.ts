import { AreaData, SpeakerMegaphonePropertyData } from "./types";

export function getSpeakerMegaphoneAreaName(
    areas: Map<string, AreaData> = new Map(),
    areaId: string
): string | undefined {
    for (const area of areas.values()) {
        const speakerMegaphonePropertyRaw = area.properties.find((property) => property.type === "speakerMegaphone");
        if (speakerMegaphonePropertyRaw) {
            const speakerMegaphoneProperty = SpeakerMegaphonePropertyData.safeParse(speakerMegaphonePropertyRaw);
            if (speakerMegaphoneProperty.success && area.id === areaId) {
                return speakerMegaphoneProperty.data.name;
            }
        }
    }
    return undefined;
}
