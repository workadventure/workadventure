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
}
