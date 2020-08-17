export class HtmlUtils {
    public static getElementByIdOrFail<T extends HTMLElement>(id: string): T {
        const elem = document.getElementById(id);
        if (elem === null) {
            throw new Error("Cannot find HTML element with id '"+id+"'");
        }
        // FIXME: does not check the type of the returned type
        return elem as T;
    }
}
