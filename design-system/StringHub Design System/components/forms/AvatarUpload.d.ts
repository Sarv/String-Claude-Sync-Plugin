export interface AvatarUploadProps {
  initials?: string;
  src?: string;
  uploading?: boolean;
  onFile?: (file: File) => void;
}
export function AvatarUpload(props: AvatarUploadProps): JSX.Element;
