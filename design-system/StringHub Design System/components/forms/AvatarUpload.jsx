import React from "react";
export function AvatarUpload({ initials = "P", src, uploading, onFile }) {
  const [url, setUrl] = React.useState(src);
  return <label className={"avatar-upload" + (uploading ? " is-uploading" : "")} aria-label="Change profile picture" aria-busy={uploading || undefined}>
    <span className="avatar-upload-img">{url ? <img src={url} alt="" /> : initials}</span>
    <span className="avatar-upload-overlay">{uploading ? <i className="bx bx-loader-alt bx-spin icon-22" aria-hidden="true"></i> : <span className="cam"><i className="bx bx-camera icon-22" aria-hidden="true"></i></span>}</span>
    <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) { setUrl(URL.createObjectURL(f)); onFile && onFile(f); } }} /></label>;
}
