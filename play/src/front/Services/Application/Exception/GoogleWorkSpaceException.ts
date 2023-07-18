import { get } from "svelte/store";
import { LL } from "../../../../i18n/i18n-svelte";

export class GoogleDocsException extends Error {
    constructor() {
        super(get(LL).mapEditor.properties.googleDocsProperties.error());
    }
}

export class GoogleSheetsException extends Error {
    constructor() {
        super(get(LL).mapEditor.properties.googleSheetsProperties.error());
    }
}

export class GoogleSlidesException extends Error {
    constructor() {
        super(get(LL).mapEditor.properties.googleSlidesProperties.error());
    }
}
