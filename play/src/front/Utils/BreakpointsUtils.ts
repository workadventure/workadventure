// If this changes, also update the matching CSS breakpoints.
const breakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
} as const;

export type Breakpoint = keyof typeof breakpoints;

const orderedBreakpoints = Object.keys(breakpoints) as Breakpoint[];

/**
 * Returns true when the viewport is narrower than the breakpoint sitting right above `breakpoint`
 * (in other words: when the viewport is still in `breakpoint` range or below).
 */
export function isMediaBreakpointUp(breakpoint: Breakpoint): boolean {
    const nextBreakpoint = orderedBreakpoints[orderedBreakpoints.indexOf(breakpoint) + 1];
    return nextBreakpoint === undefined || window.innerWidth < breakpoints[nextBreakpoint];
}
