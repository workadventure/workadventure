// A link inside one of these is being shown, not shared: previewing it would be noise.
const SKIPPED_TAGS = new Set(["PRE", "CODE", "BLOCKQUOTE"]);

function parseUrl(href: string): URL | undefined {
    try {
        return new URL(href);
    } catch {
        return undefined;
    }
}

function previewableHref(anchor: HTMLAnchorElement): string | undefined {
    const href = anchor.getAttribute("href");
    if (href === null) {
        return undefined;
    }

    const url = parseUrl(href);
    if (url === undefined || (url.protocol !== "http:" && url.protocol !== "https:")) {
        return undefined;
    }

    // Previewing ourselves tells the user nothing they don't already see.
    if (url.origin === window.location.origin) {
        return undefined;
    }

    const text = anchor.textContent ?? "";

    // "example.com/an-article": a deep link, worth previewing.
    if (text.includes("/")) {
        return href;
    }
    // A bare "example.com". Prose is full of things that autolink into a bare host
    // ("foo.pl", "etc.io") and a card under each of them would be unbearable.
    if (text.toLowerCase().trim().startsWith(url.host.toLowerCase())) {
        return undefined;
    }
    // Anything else is a [labelled](link), which the sender wrote on purpose.
    return href;
}

function collectLinks(nodes: Iterable<Element>, links: Set<string>): void {
    for (const node of nodes) {
        if (node.tagName === "A") {
            const href = previewableHref(node as HTMLAnchorElement);
            if (href !== undefined) {
                links.add(href);
            }
        } else if (SKIPPED_TAGS.has(node.tagName)) {
            continue;
        } else if (node.children.length > 0) {
            collectLinks(node.children, links);
        }
    }
}

/**
 * Collects the links worth previewing out of an already rendered message.
 *
 * Reads the DOM rather than the message source on purpose: a reply is rendered from its
 * formatted_body HTML, which never passes through our markdown renderer, so anything that
 * inspects the source would silently miss every link in a reply.
 *
 * @returns unique hrefs, in the order they appear.
 */
export function findPreviewableLinks(root: Element): string[] {
    const links = new Set<string>();
    collectLinks([root], links);
    return [...links];
}
