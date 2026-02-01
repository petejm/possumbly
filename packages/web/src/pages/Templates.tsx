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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-possum-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-possum-800">Templates</h1>
        <button onClick={() => setShowUpload(true)} className="btn btn-primary">
          Upload Template
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">
            &times;
          </button>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full">
            <h2 className="text-xl font-bold text-possum-800 mb-4">Upload Template</h2>
            <form onSubmit={handleUpload}>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
                  dragOver ? 'border-possum-600 bg-possum-100' : 'border-possum-300'
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
                    <p className="text-possum-600">{uploadFile.name}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-possum-600 mb-2">Drag and drop an image here, or click to select</p>
                    <p className="text-possum-400 text-sm">Supports JPEG, PNG, GIF, WebP (max 10MB)</p>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-possum-700 mb-1">
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
          <p className="text-possum-500 text-lg mb-4">No templates yet</p>
          <button onClick={() => setShowUpload(true)} className="btn btn-primary">
            Upload your first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {templateList.map((template) => (
            <div key={template.id} className="card p-4 group relative">
              <div
                className="aspect-square bg-possum-100 rounded-lg mb-3 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/editor/${template.id}`)}
              >
                <img
                  src={templates.imageUrl(template.filename)}
                  alt={template.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <h3 className="font-medium text-possum-800 truncate">{template.name}</h3>
              <p className="text-sm text-possum-500">
                {template.width} x {template.height}
              </p>
              <button
                onClick={() => handleDelete(template.id)}
                className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
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
