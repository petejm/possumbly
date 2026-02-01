import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from 'react-konva';
import Konva from 'konva';
import { templates, memes, Template, TextBox, EditorState } from '../lib/api';

const FONTS = [
  'Impact',
  'Arial',
  'Arial Black',
  'Comic Sans MS',
  'Courier New',
  'Georgia',
  'Times New Roman',
  'Verdana',
];

const DEFAULT_TEXT_BOX: Omit<TextBox, 'id'> = {
  text: 'YOUR TEXT HERE',
  x: 50,
  y: 50,
  width: 300,
  fontSize: 48,
  fontFamily: 'Impact',
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 2,
  align: 'center',
  rotation: 0,
};

export default function Editor() {
  const { templateId, memeId } = useParams<{ templateId: string; memeId?: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<Template | null>(null);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentMemeId, setCurrentMemeId] = useState<string | null>(memeId || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Load template and meme data
  useEffect(() => {
    const loadData = async () => {
      if (!templateId) return;

      try {
        const templateData = await templates.get(templateId);
        setTemplate(templateData);

        // Load template image
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = templates.imageUrl(templateData.filename);
        img.onload = () => {
          setTemplateImage(img);
          updateStageSize(templateData.width, templateData.height);
        };

        // Load existing meme if editing
        if (memeId) {
          const memeData = await memes.get(memeId);
          setTextBoxes(memeData.editor_state.textBoxes || []);
          setCurrentMemeId(memeId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [templateId, memeId]);

  // Update stage size based on container
  const updateStageSize = useCallback((templateWidth: number, templateHeight: number) => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const maxHeight = window.innerHeight - 200;

    const scale = Math.min(containerWidth / templateWidth, maxHeight / templateHeight, 1);

    setStageSize({
      width: templateWidth * scale,
      height: templateHeight * scale,
    });
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (template) {
        updateStageSize(template.width, template.height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [template, updateStageSize]);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const stage = stageRef.current;
    const transformer = transformerRef.current;

    if (selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) {
        transformer.nodes([node]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  const addTextBox = () => {
    const id = `text-${Date.now()}`;
    const newBox: TextBox = {
      ...DEFAULT_TEXT_BOX,
      id,
      y: 50 + textBoxes.length * 60,
    };
    setTextBoxes([...textBoxes, newBox]);
    setSelectedId(id);
  };

  const updateTextBox = (id: string, updates: Partial<TextBox>) => {
    setTextBoxes((boxes) => boxes.map((box) => (box.id === id ? { ...box, ...updates } : box)));
  };

  const deleteTextBox = (id: string) => {
    setTextBoxes((boxes) => boxes.filter((box) => box.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  const handleTextDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const scale = getScale();
    updateTextBox(id, {
      x: e.target.x() / scale,
      y: e.target.y() / scale,
    });
  };

  const handleTransformEnd = (id: string, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target as Konva.Text;
    const scale = getScale();
    updateTextBox(id, {
      x: node.x() / scale,
      y: node.y() / scale,
      width: (node.width() * node.scaleX()) / scale,
      rotation: node.rotation(),
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  const getScale = () => {
    if (!template) return 1;
    return stageSize.width / template.width;
  };

  const saveToServer = async () => {
    if (!templateId) return;

    setSaving(true);
    setError('');

    try {
      const editorState: EditorState = { textBoxes };

      if (currentMemeId) {
        await memes.update(currentMemeId, editorState);
      } else {
        const newMeme = await memes.create(templateId, editorState);
        setCurrentMemeId(newMeme.id);
        navigate(`/editor/${templateId}/${newMeme.id}`, { replace: true });
      }

      // Also render and save the image
      if (stageRef.current && currentMemeId) {
        const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1 / getScale() });
        await memes.render(currentMemeId, dataUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meme');
    } finally {
      setSaving(false);
    }
  };

  const downloadMeme = () => {
    if (!stageRef.current || !template) return;

    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1 / getScale() });
    const link = document.createElement('a');
    link.download = `meme-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const selectedBox = textBoxes.find((box) => box.id === selectedId);

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

  if (!template || !templateImage) {
    return (
      <div className="text-center py-16">
        <p style={{ color: 'var(--color-error)' }} className="text-lg">
          {error || 'Template not found'}
        </p>
        <button onClick={() => navigate('/')} className="btn btn-primary mt-4">
          Back to Templates
        </button>
      </div>
    );
  }

  const scale = getScale();

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Canvas Area */}
      <div className="flex-1">
        <div ref={containerRef} className="bg-themed-tertiary rounded-lg p-4 overflow-hidden">
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onClick={handleStageClick}
            className="mx-auto"
            style={{ background: '#000' }}
          >
            <Layer>
              <KonvaImage image={templateImage} width={stageSize.width} height={stageSize.height} />
              {textBoxes.map((box) => (
                <Text
                  key={box.id}
                  id={box.id}
                  text={box.text}
                  x={box.x * scale}
                  y={box.y * scale}
                  width={box.width * scale}
                  fontSize={box.fontSize * scale}
                  fontFamily={box.fontFamily}
                  fill={box.fill}
                  stroke={box.stroke}
                  strokeWidth={box.strokeWidth * scale}
                  align={box.align}
                  rotation={box.rotation}
                  draggable
                  onClick={() => setSelectedId(box.id)}
                  onTap={() => setSelectedId(box.id)}
                  onDragEnd={(e) => {
                    handleTextDragEnd(box.id, e);
                    e.target.position({
                      x: e.target.x(),
                      y: e.target.y(),
                    });
                  }}
                  onTransformEnd={(e) => handleTransformEnd(box.id, e)}
                />
              ))}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 20 || newBox.height < 20) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
        </div>

        {error && (
          <div
            className="px-4 py-3 rounded-lg mt-4 border"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'var(--color-error)',
              color: 'var(--color-error)',
            }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-4 mt-4">
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            Back
          </button>
          <button onClick={addTextBox} className="btn btn-secondary">
            Add Text
          </button>
          <button onClick={saveToServer} className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={downloadMeme} className="btn btn-primary">
            Download
          </button>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="w-full lg:w-80">
        <div className="card">
          <h2 className="text-lg font-bold text-themed-primary mb-4">Text Boxes</h2>

          {textBoxes.length === 0 ? (
            <p className="text-themed-muted text-sm mb-4">
              No text boxes yet. Click "Add Text" to get started.
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {textBoxes.map((box, index) => (
                <div
                  key={box.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    selectedId === box.id ? 'bg-themed-tertiary' : 'hover:bg-themed-secondary'
                  }`}
                  onClick={() => setSelectedId(box.id)}
                >
                  <span className="text-sm truncate flex-1 text-themed-primary">
                    Text {index + 1}: {box.text.substring(0, 20)}
                    {box.text.length > 20 && '...'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTextBox(box.id);
                    }}
                    className="ml-2 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-error)' }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedBox && (
            <div className="border-t border-themed pt-4 space-y-4">
              <h3 className="font-medium text-themed-secondary">Edit Selected Text</h3>

              <div>
                <label className="block text-sm font-medium text-themed-secondary mb-1">Text</label>
                <textarea
                  value={selectedBox.text}
                  onChange={(e) => updateTextBox(selectedBox.id, { text: e.target.value })}
                  className="input w-full h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-themed-secondary mb-1">Font</label>
                <select
                  value={selectedBox.fontFamily}
                  onChange={(e) => updateTextBox(selectedBox.id, { fontFamily: e.target.value })}
                  className="input w-full"
                >
                  {FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-themed-secondary mb-1">
                  Font Size: {selectedBox.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="120"
                  value={selectedBox.fontSize}
                  onChange={(e) =>
                    updateTextBox(selectedBox.id, { fontSize: parseInt(e.target.value) })
                  }
                  className="w-full accent-current"
                  style={{ accentColor: 'var(--color-bg-accent)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-themed-secondary mb-1">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={selectedBox.fill}
                    onChange={(e) => updateTextBox(selectedBox.id, { fill: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-themed-secondary mb-1">
                    Stroke Color
                  </label>
                  <input
                    type="color"
                    value={selectedBox.stroke}
                    onChange={(e) => updateTextBox(selectedBox.id, { stroke: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-themed-secondary mb-1">
                  Stroke Width: {selectedBox.strokeWidth}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={selectedBox.strokeWidth}
                  onChange={(e) =>
                    updateTextBox(selectedBox.id, { strokeWidth: parseInt(e.target.value) })
                  }
                  className="w-full"
                  style={{ accentColor: 'var(--color-bg-accent)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-themed-secondary mb-1">
                  Alignment
                </label>
                <div className="flex gap-2">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => updateTextBox(selectedBox.id, { align })}
                      className={`flex-1 py-2 rounded transition-colors ${
                        selectedBox.align === align
                          ? 'text-themed-inverse'
                          : 'bg-themed-secondary text-themed-primary hover:bg-themed-tertiary'
                      }`}
                      style={
                        selectedBox.align === align
                          ? { backgroundColor: 'var(--color-bg-accent)' }
                          : {}
                      }
                    >
                      {align.charAt(0).toUpperCase() + align.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
