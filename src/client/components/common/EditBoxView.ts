import Component from "../Component";
import { elem } from "../element-util";
import './style/EditBoxViewStyle.css'

export interface EditBoxView extends Component {
    on(ev: 'change', callback: (data: string) => void): this;
    emit(ev: 'change', data: string): boolean;
    on(ev: 'input', callback: (data: string) => void): this;
    emit(ev: 'input', data: string): boolean;
}

export type EditBoxViewOptions = {
    placeholder?: string,
    rows: number,
    minWidth?: string,
    readonly?: boolean
};

export class EditBoxView extends Component {
    private textbox: HTMLTextAreaElement;

    constructor(label: string, options: EditBoxViewOptions) {
        super(elem('div', {c: 'editBox'}))
        if(options.minWidth)
            this.element.style.minWidth = options.minWidth;

        const {
            placeholder,
            rows,
            readonly
        } = options;

        let labelNode = document.createElement('span');
        labelNode.textContent = label;
        this.element.appendChild(labelNode);

        let textarea = document.createElement('textarea');

        textarea.rows = rows;

        if(placeholder)
            textarea.placeholder = placeholder;

        if(readonly)
            textarea.readOnly = true;

        this.element.appendChild(textarea);
        Component.setFocusable(textarea);


        textarea.onchange = () => this.emit('change', textarea.value);
        textarea.oninput = () => {
            this.emit('input', textarea.value);
        }

        this.textbox = textarea;
    }

    disableAndClear() {
        this.textbox.setAttribute('disabled', 'true');
        this.textbox.value = "";
    }

    enableAndSet(value: string) {
        this.textbox.removeAttribute('disabled');
        this.textbox.value = value;
    }

    getValue() {
        return this.textbox.value;
    }

    public updatePlaceholder(s: string){
        this.textbox.placeholder = s;
    }

}
