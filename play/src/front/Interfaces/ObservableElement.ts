/**
 * Interface for HTML elements that can be observed by IntersectionObserver
 * and have a visibility callback function attached to them.
 */
export interface ObservableElement extends HTMLDivElement {
    visibilityCallback?: (isVisible: boolean) => void;
}
