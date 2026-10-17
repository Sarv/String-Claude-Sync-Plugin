export interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  /** Text prefix, e.g. "stringhub.app/" */
  prefix?: string;
  /** min-width 240px, for toolbars/topbar */
  search?: boolean;
}
export function InputGroup(props: InputGroupProps): JSX.Element;
