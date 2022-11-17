type InternalBreakpoint = {
    beforeBreakpoint: InternalBreakpoint | undefined;
    nextBreakpoint: InternalBreakpoint | undefined;
    pixels: number;
};

function generateBreakpointsMap(): Map<string, InternalBreakpoint> {
    // If is changed don't forget to also change it on SASS.
    const breakpoints: { [key: string]: number } = {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
        xxl: 1400,
    };

    let beforeBreakpoint: InternalBreakpoint | undefined;
    let beforeBreakpointTag: string | undefined;
    const mapRender = new Map<string, InternalBreakpoint>();

    for (const breakpoint in breakpoints) {
        const newBreakpoint = {
            beforeBreakpoint: beforeBreakpoint,
            nextBreakpoint: undefined,
            pixels: breakpoints[breakpoint],
        };

        if (beforeBreakpointTag && beforeBreakpoint) {
            beforeBreakpoint.nextBreakpoint = newBreakpoint;
            mapRender.set(beforeBreakpointTag, beforeBreakpoint);
        }

        mapRender.set(breakpoint, {
            beforeBreakpoint: beforeBreakpoint,
            nextBreakpoint: undefined,
            pixels: breakpoints[breakpoint],
        });

        beforeBreakpointTag = breakpoint;
        beforeBreakpoint = newBreakpoint;
    }

    return mapRender;
}

const breakpoints = generateBreakpointsMap();

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

export function isMediaBreakpointUp(breakpoint: Breakpoint): boolean {
    if (breakpoint === "xxl") {
        return true;
    }

    const breakpointObject = breakpoints.get(breakpoint);

    if (!breakpointObject) {
        throw new Error(`Unknown breakpoint: ${breakpoint}`);
    }

    if (!breakpointObject.nextBreakpoint) {
        return false;
    }

    return breakpointObject.nextBreakpoint.pixels - 1 >= window.innerWidth;
}

export function isMediaBreakpointDown(breakpoint: Breakpoint): boolean {
    if (breakpoint === "xs") {
        return true;
    }

    const breakpointObject = breakpoints.get(breakpoint);

    if (!breakpointObject) {
        throw new Error(`Unknown breakpoint: ${breakpoint}`);
    }

    return breakpointObject.pixels <= window.innerWidth;
}

export function isMediaBreakpointOnly(breakpoint: Breakpoint): boolean {
    const breakpointObject = breakpoints.get(breakpoint);

    if (!breakpointObject) {
        throw new Error(`Unknown breakpoint: ${breakpoint}`);
    }

    return (
        breakpointObject.pixels <= window.innerWidth &&
        (!breakpointObject.nextBreakpoint || breakpointObject.nextBreakpoint.pixels - 1 >= window.innerWidth)
    );
}

export function isMediaBreakpointBetween(startBreakpoint: Breakpoint, endBreakpoint: Breakpoint): boolean {
    const startBreakpointObject = breakpoints.get(startBreakpoint);
    const endBreakpointObject = breakpoints.get(endBreakpoint);

    if (!startBreakpointObject) {
        throw new Error(`Unknown start breakpoint: ${startBreakpointObject}`);
    }

    if (!endBreakpointObject) {
        throw new Error(`Unknown end breakpoint: ${endBreakpointObject}`);
    }

    return (
        startBreakpointObject.pixels <= innerWidth &&
        (!endBreakpointObject.nextBreakpoint || endBreakpointObject.nextBreakpoint.pixels - 1 >= window.innerWidth)
    );
}
