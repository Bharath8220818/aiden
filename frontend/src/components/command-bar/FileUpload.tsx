import { useState, useRef, type DragEvent } from 'react';
import { Upload, X, Image, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export function FileUpload({ onFileSelect, accept = 'image/*,.pdf', maxSize = 10 * 1024 * 1024 }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): boolean => {
    if (f.size > maxSize) {
      setError(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && validateFile(f)) {
      setFile(f);
      onFileSelect(f);
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && validateFile(f)) {
      setFile(f);
      onFileSelect(f);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
            isDragging
              ? 'border-purple-500/50 bg-purple-500/10'
              : 'border-[var(--color-border)] hover:border-purple-500/30 hover:bg-purple-500/5'
          }`}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
            <Upload className="h-6 w-6 text-purple-400" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text)]">Drop your diagram here</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">or click to browse (PNG, JPG, PDF up to 10MB)</p>
          <input ref={inputRef} type="file" accept={accept} onChange={handleSelect} className="hidden" />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-hover)] p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
            {file.type.startsWith('image/') ? (
              <Image className="h-5 w-5 text-purple-400" />
            ) : (
              <FileText className="h-5 w-5 text-purple-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)] truncate">{file.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={handleRemove} className="btn-icon btn-sm shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
