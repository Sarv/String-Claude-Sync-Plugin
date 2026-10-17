export interface ChatComposerProps {
  placeholder?: string;
  note?: boolean;
  onSend?: (text: string) => void;
  onNote?: () => void;
}
export function ChatComposer(props: ChatComposerProps): JSX.Element;
