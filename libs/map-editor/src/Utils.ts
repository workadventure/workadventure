import { SpeakerMegaphonePropertyData } from "./types";
import { GameMapAreas } from "./GameMap/GameMapAreas";

export function getSpeakerMegaphoneAreaName(areas: GameMapAreas | undefined, areaId: string): string | undefined {
    areas?.getAreas().forEach((area) => {
        const speakerMegaphonePropertyRaw = area.properties?.find((property) => property.type === "speakerMegaphone");
        if (speakerMegaphonePropertyRaw) {
            const speakerMegaphoneProperty = SpeakerMegaphonePropertyData.safeParse(speakerMegaphonePropertyRaw);
            if (speakerMegaphoneProperty.success) {
                if (area.id === areaId) {
                    return speakerMegaphoneProperty.data.name;
                }
            }
        }
    });
    return undefined;
}
