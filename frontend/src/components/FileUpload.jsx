/**
 * FileUpload — drag-and-drop file upload zone with preview.
 */
import { useState, useRef } from 'react';

export default function FileUpload({
  onFileSelect,
  accept = '.zip',
  hint = 'Drag & drop a file here, or click to browse',
  icon = '📂',
  maxSize = null,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFile = (file) => {
    if (maxSize && file.size > maxSize) {
      alert(`File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }
    setSelectedFile(file);
    if (onFileSelect) onFileSelect(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div
      className={`upload-zone ${isDragging ? 'active' : ''}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      <div className="upload-zone-icon">{icon}</div>
      {selectedFile ? (
        <>
          <div className="upload-zone-text">✅ {selectedFile.name}</div>
          <div className="upload-zone-hint">{formatSize(selectedFile.size)} — Click to change</div>
        </>
      ) : (
        <>
          <div className="upload-zone-text">{hint}</div>
          <div className="upload-zone-hint">Accepted: {accept}</div>
        </>
      )}
    </div>
  );
}
