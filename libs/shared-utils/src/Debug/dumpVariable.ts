/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

export function dumpVariable(variable: unknown, customReplacer?: (value: unknown, path: string) => unknown): string {
    type QueueItem = {
        value: unknown;
        originalValue: unknown;
        path: string;
        depth: number;
        parentNode: OutputNode | null;
    };

    interface OutputNode {
        line: string;
        children: OutputNode[];
        depth: number;
    }

    const queue: QueueItem[] = [{ value: variable, originalValue: variable, path: "root", depth: 0, parentNode: null }];
    const visited = new Map<unknown, string>();
    let rootNode: OutputNode | null = null;

    while (queue.length > 0) {
        const { value: originalValue, path, depth, parentNode } = queue.shift()!;

        let value = originalValue;
        if (customReplacer) {
            value = customReplacer(value, path);
        }

        let line: string;

        if (typeof value === "function") {
            // Handle functions by outputting a placeholder without the body
            const functionName = value.name ? `: ${value.name}` : "";
            line = `${path}: [Function${functionName}]`;
            const currentNode: OutputNode = {
                line,
                children: [],
                depth,
            };
            if (parentNode) {
                parentNode.children.push(currentNode);
            } else {
                rootNode = currentNode;
            }
        } else if (value !== null && typeof value === "object") {
            if (visited.has(value)) {
                const originalPath = visited.get(value);
                line = `${path}: [Circular Reference to ${originalPath}]`;
                const currentNode: OutputNode = {
                    line,
                    children: [],
                    depth,
                };
                if (parentNode) {
                    parentNode.children.push(currentNode);
                } else {
                    rootNode = currentNode;
                }
            } else {
                visited.set(value, path);
                const typeName = getTypeName(value);
                line = `${path}: ${typeName}`;
                const currentNode: OutputNode = {
                    line,
                    children: [],
                    depth,
                };
                if (parentNode) {
                    parentNode.children.push(currentNode);
                } else {
                    rootNode = currentNode;
                }

                // Enqueue child properties based on type
                if (value instanceof Map) {
                    let index = 0;
                    for (const [key, val] of value) {
                        let keyPath: string;
                        if (typeof key === "string") {
                            keyPath = `${path}.${key}`;
                        } else {
                            keyPath = `${path}[entry${index}]`;
                            // Add key representation as a child node
                            const keyNode: OutputNode = {
                                line: `${keyPath}.key: ${String(key)}`,
                                children: [],
                                depth: depth + 1,
                            };
                            currentNode.children.push(keyNode);
                            // Update the path for the value
                            keyPath = `${keyPath}.value`;
                        }

                        queue.push({
                            value: val,
                            originalValue: val,
                            path: keyPath,
                            depth: depth + 1,
                            parentNode: currentNode,
                        });
                        index++;
                    }
                } else if (value instanceof Set) {
                    let index = 0;
                    for (const item of value) {
                        queue.push({
                            value: item,
                            originalValue: item,
                            path: `${path}[${index}]`,
                            depth: depth + 1,
                            parentNode: currentNode,
                        });
                        index++;
                    }
                } else if (isIterable(value) && !(value instanceof String)) {
                    let index = 0;
                    for (const item of value) {
                        queue.push({
                            value: item,
                            originalValue: item,
                            path: `${path}[${index}]`,
                            depth: depth + 1,
                            parentNode: currentNode,
                        });
                        index++;
                    }
                } else {
                    // Regular object properties
                    for (const key in value) {
                        if (Object.prototype.hasOwnProperty.call(value, key)) {
                            queue.push({
                                value: (value as any)[key],
                                originalValue: (value as any)[key],
                                path: `${path}.${key}`,
                                depth: depth + 1,
                                parentNode: currentNode,
                            });
                        }
                    }
                }
            }
        } else {
            // Handle primitive values
            line = `${path}: ${String(value)}`;
            const currentNode: OutputNode = {
                line,
                children: [],
                depth,
            };
            if (parentNode) {
                parentNode.children.push(currentNode);
            } else {
                rootNode = currentNode;
            }
        }
    }

    // Depth-first traversal to produce output lines
    const outputLines: string[] = [];

    function traverse(node: OutputNode) {
        const indent = "  ".repeat(node.depth);
        outputLines.push(indent + node.line);
        for (const child of node.children) {
            traverse(child);
        }
    }

    if (rootNode) {
        traverse(rootNode);
    }

    return outputLines.join("\n");

    // Helper functions
    function isIterable(obj: unknown): obj is Iterable<unknown> {
        return obj != null && typeof (obj as any)[Symbol.iterator] === "function";
    }

    function getTypeName(obj: unknown): string {
        if (obj instanceof Map) {
            return "Map";
        } else if (obj instanceof Set) {
            return "Set";
        } else if (Array.isArray(obj)) {
            return "Array";
        } else if (obj !== null && typeof obj === "object" && obj.constructor && obj.constructor.name) {
            return obj.constructor.name;
        } else {
            return typeof obj;
        }
    }
}
