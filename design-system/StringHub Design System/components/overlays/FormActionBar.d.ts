export interface FormActionBarProps {
  note?: React.ReactNode;
  /** Pin to the bottom of a scrolling form */
  sticky?: boolean;
  children: React.ReactNode;
}
export function FormActionBar(props: FormActionBarProps): JSX.Element;
