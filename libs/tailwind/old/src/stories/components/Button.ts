export type ButtonArgs = {
    primary: boolean;
    label: string;
}

export const createButton = ({
    primary = false,
    label,
}) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerText = label ?? 'Button';

    const color = primary ? 'light' : 'dark';

    btn.classList.add('btn', color);

    return btn;
};
