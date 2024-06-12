import Component from "../Component";

export interface LabeledTextbox extends Component {
    on(ev: 'change', callback: (data: string) => void): this;
    emit(ev: 'change', data: string): boolean;
    on(ev: 'input', callback: (data: string) => void): this;
    emit(ev: 'input', data: string): boolean;
    on(ev: 'submit', callback: (data: string) => void): this;
    emit(ev: 'submit', data: string): boolean;
}

export type LabeledTextboxOptions = {
    placeholder: string,
    submitButtonText?: string,
    pattern?: string,
    required?: boolean,
    title?: string,
    submitOnChange?: boolean,
    size: number
}
export class LabeledTextbox extends Component {
    private textbox: HTMLInputElement;
    private submitButton?: HTMLInputElement;

    constructor(label: string, options: LabeledTextboxOptions) {
        super(document.createElement('form'));

        const {
            placeholder,
            submitButtonText,
            pattern,
            required,
            title,
            submitOnChange,
            size
        } = options;

        let labelNode = document.createElement('span');
        labelNode.textContent = label;
        this.element.appendChild(labelNode);

        let textbox = document.createElement('input');

        textbox.type = 'text';
        textbox.size = size;

        textbox.placeholder = placeholder;
        this.element.appendChild(textbox);
        Component.setFocusable(textbox);

        if (submitButtonText) {
            let submitButton = document.createElement('input');
            submitButton.type = 'submit';
            submitButton.value = submitButtonText;
            this.element.appendChild(submitButton);
            this.submitButton = submitButton;

            if(submitOnChange){
                textbox.addEventListener('change', ()=>submitButton.click());
            }

        }

        if(required){
            textbox.required = true;
        }

        if (pattern) {
            textbox.pattern = pattern;
        }

        if(title){
            textbox.title = title;
        }

        this.element.onsubmit = (ev) => {
            ev.preventDefault();
            this.emit('submit', textbox.value)
            return false;
        }
        textbox.onchange = () => this.emit('change', textbox.value);
        textbox.oninput = () => {
            this.emit('input', textbox.value);
        }

        this.textbox = textbox;
    }

    disableAndClear() {
        this.textbox.setAttribute('disabled', 'true');
        if (this.submitButton)
            this.submitButton.setAttribute('disabled', 'true');
        this.textbox.value = "";
    }

    enableAndSet(value: string) {
        this.textbox.removeAttribute('disabled');
        if (this.submitButton)
            this.submitButton.removeAttribute('disabled');
        this.textbox.value = value;
    }

    getValue() {
        return this.textbox.value;
    }


}
