export interface DropzoneProps {
  title?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
}
export function Dropzone(props: DropzoneProps): JSX.Element;
