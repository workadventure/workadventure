import { Meta } from '@storybook/html';
import { createButton } from './Button';

export default {
  title: 'Components/Button',
  argTypes: {
    label: { control: 'text' },
    primary: { control: 'boolean' },
  },
} as Meta;

const Template = ({ label, ...args }) => {
  return createButton({ label, ...args });
};

export const Primary = Template.bind({});
Primary.args = {
  primary: true, label: "Button"
};

export const Secondary = Template.bind({});
Secondary.args = {
  primary: false, label: "Button"
};
