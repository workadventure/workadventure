export const validateLink = (url: URL, regexStr: string, errorEmbeddableLink: string, targetEmbedableUrl?: string) => {
    let link = url.toString();
    const regexUrl = new URL(regexStr);
    const regex = new RegExp(regexStr.replace("?", "[?]"), "g");
    if (link.indexOf(regexUrl.host) != -1) {
        // if property has "targetEmbedableLink" transform the link to embedable link with regex
        if (targetEmbedableUrl) {
            const matches = regex.exec(link);
            if (matches) {
                link = targetEmbedableUrl.replace(/\$[0-9]+/g, (match) => {
                    const index = parseInt(match.substring(1));
                    return matches[index] ?? "";
                });
            }
        }
    } else if (targetEmbedableUrl) {
        if (targetEmbedableUrl?.indexOf(url.host) == -1) {
            // If the link exists but is not the same of embedable link target, their is an error;
            throw new Error(`${errorEmbeddableLink} (${regexStr})`);
        }
    } else {
        throw new Error(`${errorEmbeddableLink} (${regexStr})`);
    }
    return link;
};
