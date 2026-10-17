export interface AccordionProps {
  items: { title: React.ReactNode; body: React.ReactNode; open?: boolean }[];
}
export function Accordion(props: AccordionProps): JSX.Element;
