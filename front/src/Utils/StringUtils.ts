export class StringUtils {
    public static parsePointFromParam(param: string, separator: string = ","): { x: number; y: number } | undefined {
        const values = param.split(separator).map((val) => parseInt(val));
        if (values.length !== 2) {
            return;
        }
        if (isNaN(values[0]) || isNaN(values[1])) {
            return;
        }
        return { x: values[0], y: values[1] };
    }
}
