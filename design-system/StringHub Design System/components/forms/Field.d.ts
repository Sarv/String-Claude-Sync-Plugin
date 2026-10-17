export interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  /** Replaces the hint; also set aria-invalid on the control */
  error?: React.ReactNode;
  required?: boolean;
  /** Full row inside .form-grid */
  span2?: boolean;
  children: React.ReactNode;
}
export function Field(props: FieldProps): JSX.Element;
