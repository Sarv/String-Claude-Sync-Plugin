export interface ListReplyComposerProps {
  to?: { name: string; email: string };
  /** pre-filled "Re: <ticket subject>" */
  subject?: string;
  defaultNote?: boolean;
  onSubmit?: (v: { note: boolean }) => void;
}
export function ListReplyComposer(props: ListReplyComposerProps): JSX.Element;
