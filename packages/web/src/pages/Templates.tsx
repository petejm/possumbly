import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { templates, Template } from '../lib/api';

export default function Templates() {
  const navigate = useNavigate();
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templates.list();
      setTemplateList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (file: File) => {
    setUploadFile(file);
    if (!uploadName) {
      setUploadName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileChange(file);
      setShowUpload(true);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) return;

    setUploading(true);
    try {
      await templates.upload(uploadFile, uploadName.trim());
      await loadTemplates();
      setShowUpload(false);
      setUploadFile(null);
      setUploadName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await templates.delete(id);
      setTemplateList((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-4 border-themed"
          style={{ borderTopColor: 'var(--color-bg-accent)' }}
        ></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-themed-primary">Templates</h1>
        <button onClick={() => setShowUpload(true)} className="btn btn-primary">
          Upload Template
        </button>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-lg mb-6 border"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'var(--color-error)',
            color: 'var(--color-error)',
          }}
        >
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">
            &times;
          </button>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full">
            <h2 className="text-xl font-bold text-themed-primary mb-4">Upload Template</h2>
            <form onSubmit={handleUpload}>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors cursor-pointer ${
                  dragOver ? 'border-themed-focus bg-themed-tertiary' : 'border-themed'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  className="hidden"
                />
                {uploadFile ? (
                  <div>
                    <img
                      src={URL.createObjectURL(uploadFile)}
                      alt="Preview"
                      className="max-h-48 mx-auto mb-2 rounded"
                    />
                    <p className="text-themed-secondary">{uploadFile.name}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-themed-secondary mb-2">
                      Drag and drop an image here, or click to select
                    </p>
                    <p className="text-themed-muted text-sm">
                      Supports JPEG, PNG, GIF, WebP (max 10MB)
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-themed-secondary mb-1"
                >
                  Template Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="input w-full"
                  placeholder="Enter template name"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpload(false);
                    setUploadFile(null);
                    setUploadName('');
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={!uploadFile || !uploadName.trim() || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {templateList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-themed-muted text-lg mb-4">No templates yet</p>
          <button onClick={() => setShowUpload(true)} className="btn btn-primary">
            Upload your first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {templateList.map((template) => (
            <div key={template.id} className="card p-4 group relative">
              <div
                className="aspect-square bg-themed-tertiary rounded-lg mb-3 overflow-hidden cursor-pointer relative"
                onClick={() => navigate(`/editor/${template.id}`)}
              >
                {/* Blurred background to fill gaps */}
                <img
                  src={templates.imageUrl(template.filename)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-50"
                  aria-hidden="true"
                />
                {/* Main image */}
                <img
                  src={templates.imageUrl(template.filename)}
                  alt={template.name}
                  className="relative w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <h3 className="font-medium text-themed-primary truncate">{template.name}</h3>
              <p className="text-sm text-themed-muted">
                {template.width} x {template.height}
              </p>
              <button
                onClick={() => handleDelete(template.id)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                style={{ backgroundColor: 'var(--color-error)' }}
                title="Delete template"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
