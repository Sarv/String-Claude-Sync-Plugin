export interface RichTextEditorProps {
  /** Show the formatting toolbar (off for replies/comments) */
  toolbar?: boolean;
  placeholder?: string;
  /** Initial HTML; headings, lists, ul.task-list, blockquote, pre, table, .callout.info|warning|success|error are styled */
  defaultHtml?: string;
  label?: string;
}
export function RichTextEditor(props: RichTextEditorProps): JSX.Element;
