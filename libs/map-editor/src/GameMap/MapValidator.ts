import { ITiledMap } from "@workadventure/tiled-map-type-guard";

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export interface ValidationError {
    type: "error" | "warning" | "info";
    message: string;
    details: string;
    link?: string;
}

export class MapValidator {
    /**
     * Check each parameter of the JSON file which can have an impact on the display of the map in play.
     * Each note of validation as the following attribute :
     * type : can have three value
     *       error : not validating this parameter will prevent the game from running
     *       warning : not validating this parameter will cause in-game problems but the game can run
     *       info : not validating this parameter has no influence on the game but we inform the admin that the map is not perfect
     * message : A concise and easily understandable text that indicate the parameter that failed validation
     * details : A text that give details on why the parameter failed the validation
     * link : A link on the documentation that indicate the rules to follow to have a valid parameter
     */
    public validateMap(map: unknown): Result<ITiledMap, ValidationError[]> {
        const parsedMap = ITiledMap.safeParse(map);

        if (!parsedMap.success) {
            const error = parsedMap.error;
            const flattenerErrors = error.flatten((issue): string => {
                return `For field "${issue.path.join(".")}": ${issue.message}`;
            });

            return {
                ok: false,
                error: [
                    {
                        type: "error",
                        message: "Your map file contains an invalid JSON structure.",
                        details: flattenerErrors.formErrors.join("\n"),
                    },
                ],
            };
        }

        return {
            ok: true,
            value: parsedMap.data,
        };
    }
}
