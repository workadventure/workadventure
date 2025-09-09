export class StringUtils {
    public static parsePointFromParam(param: string, separator = ","): { x: number; y: number } | undefined {
        const values = param.split(separator).map((val) => parseInt(val));
        if (values.length !== 2) {
            return;
        }
        if (isNaN(values[0]) || isNaN(values[1])) {
            return;
        }
        return { x: values[0], y: values[1] };
    }

    public static normalizeDeviceName = function (label: string): string {
        // remove IDs (that can appear in Chrome, like: "HD Pro Webcam (4df7:4eda)"
        return label.replace(/(\([[0-9a-f]{4}:[0-9a-f]{4}\))/g, "").trim();
    };

    /**
     * Detects if a string contains non-Latin characters (e.g., Arabic, Chinese, Japanese, Korean)
     * Latin characters include: Basic Latin, Latin-1 Supplement, Latin Extended-A and Latin Extended-B
     * @param text The text to check
     * @returns true if the text contains non-Latin characters, false otherwise
     */
    public static containsNonLatinCharacters(text: string): boolean {
        for (const char of text) {
            const codePoint = char.codePointAt(0);
            if (codePoint === undefined) continue;

            // Latin character ranges:
            // 0x0000-0x007F: Basic Latin
            // 0x0080-0x00FF: Latin-1 Supplement
            // 0x0100-0x017F: Latin Extended-A
            // 0x0180-0x024F: Latin Extended-B
            // 0x1E00-0x1EFF: Latin Extended Additional
            // 0x2C60-0x2C7F: Latin Extended-C
            // 0xA720-0xA7FF: Latin Extended-D
            const isLatin =
                (codePoint >= 0x0000 && codePoint <= 0x024f) ||
                (codePoint >= 0x1e00 && codePoint <= 0x1eff) ||
                (codePoint >= 0x2c60 && codePoint <= 0x2c7f) ||
                (codePoint >= 0xa720 && codePoint <= 0xa7ff);

            // If we find a non-Latin character, return true
            if (!isLatin) {
                return true;
            }
        }
        return false;
    }
}
