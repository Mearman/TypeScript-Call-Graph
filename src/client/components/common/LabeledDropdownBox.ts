import Component from "../Component";

export interface LabeledDropdownBox<O extends string>{
    on(ev: 'select', handler:(opts: O)=>void): this;
    emit(ev: 'select', option: O): boolean;
}

export class LabeledDropdownBox<O extends string> extends Component{

    private selectBox: HTMLSelectElement;

    constructor(label: string | null, options: O[], initial: O){
        super(document.createElement('div'));

        if(label){
            let labelNode = document.createElement('span');
            labelNode.textContent = label;
            this.element.appendChild(labelNode);
        }

        let select = document.createElement('select');
        this.selectBox = select;
        this.setOptions(options, initial);

        this.element.appendChild(select);

        select.addEventListener('change', ()=>{
            this.emit('select', select.value as O);
        });

        Component.setFocusable(select);
    }

    setOptions(options: O[], initial: O){
        this.selectBox.innerHTML = "";
        options.forEach(opt=>{
            let optionElement = document.createElement('option');
            optionElement.value = opt;
            optionElement.textContent = opt;
            this.selectBox.appendChild(optionElement);
        });
        this.selectBox.value = initial;
        this.emit('select', initial);
    }

    getSelected(){
        return this.selectBox.value as O;
    }

    setSelected(option: O){
        this.selectBox.value = option;
        this.emit('select', option);
    }

}