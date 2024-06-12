import { EventEmitter } from "events";

export default abstract class Component extends EventEmitter {
    protected element: HTMLElement;

    private initialDisplay: string;
    constructor(element: HTMLElement) {
        super();
        this.element = element;
        this.initialDisplay = element.style.display;
    }

    getElement() {
        return this.element;
    }

    setFocusable() {
        Component.setFocusable(this.element);
    }

    setVisible(visible: boolean) {
        if (visible)
            this.element.style.display = this.initialDisplay;
        else
            this.element.style.display = "none";
    }

    protected static setFocusable(element: HTMLElement) {
        element.tabIndex = 0;

        element.addEventListener('keydown', ev => {
            if (ev.key == "Delete" || ev.key == "Backspace") {
                ev.stopPropagation();
            }
        });

        element.addEventListener('pointerdown', (ev) => {
            ev.stopPropagation();
        });

        element.addEventListener('touchstart', (ev) => {
            ev.stopPropagation();
        });

        element.addEventListener('mousedown', (ev) => {
            ev.stopPropagation();
        });

        element.addEventListener('contextmenu', ev => {
            ev.stopPropagation();
        });

    }
}