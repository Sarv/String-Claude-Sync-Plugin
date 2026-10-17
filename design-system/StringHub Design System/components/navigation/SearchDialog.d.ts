export interface SearchResult { icon?: string; title: string; sub?: string; key?: string; meta?: string; }
export interface SearchDialogProps {
  open: boolean;
  onClose?: () => void;
  results: SearchResult[];
  onSelect?: (r: SearchResult) => void;
  placeholder?: string;
}
export function SearchDialog(props: SearchDialogProps): JSX.Element | null;
