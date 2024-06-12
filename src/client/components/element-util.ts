export type ElementProps = {
    /** className */
    c?: string,

    /** style */
    s?: Partial<CSSStyleDeclaration>
};


/**
 * A helper function to create an HTMLElement
 */
export function elem(tag: string, props: ElementProps, children?: Node[] | string): HTMLElement {
    const element = document.createElement(tag);
    const { c, s } = props;
    const style = s || {} as CSSStyleDeclaration;

    // set class
    if (c)
        element.className = c;

    // set style
    for (let key in style) {
        element.style[key] = style[key]!;
    }

    // add children or set text
    if (children) {
        if (children instanceof Array) {
            for (const child of children)
                element.appendChild(child);
        } else {
            element.innerText = children;
        }
    }

    return element;
}