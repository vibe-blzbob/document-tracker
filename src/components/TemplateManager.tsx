import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Sliders,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
  Layers
} from 'lucide-react';
import { Template, CustomFieldDefinition, FieldType } from '../types';
import { api } from '../api';

interface TemplateManagerProps {
  templates: Template[];
  onTemplatesUpdated: (templates: Template[]) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onTemplatesUpdated
}) => {
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stages, setStages] = useState<string[]>([]);
  const [newStageInput, setNewStageInput] = useState('');
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);

  // New field state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openEditor = (template?: Template) => {
    setError(null);
    setSuccessMsg(null);
    if (template) {
      setEditingTemplate(template);
      setIsNew(false);
      setName(template.name);
      setDescription(template.description || '');
      setStages([...template.stages]);
      setFields([...template.fields]);
    } else {
      setEditingTemplate({
        id: '',
        name: '',
        description: '',
        icon: 'FileText',
        stages: ['Draft', 'In Review', 'Approved'],
        fields: [],
        created_at: ''
      });
      setIsNew(true);
      setName('');
      setDescription('');
      setStages(['Draft', 'In Review', 'Approved']);
      setFields([]);
    }
  };

  const handleAddStage = () => {
    if (!newStageInput.trim()) return;
    if (stages.includes(newStageInput.trim())) {
      setError('Stage name already exists in this template.');
      return;
    }
    setStages([...stages, newStageInput.trim()]);
    setNewStageInput('');
    setError(null);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      setError('A template must have at least one lifecycle stage.');
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      setError('Field name is required.');
      return;
    }
    const id = newFieldName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (fields.some((f) => f.id === id)) {
      setError(`A field with ID "${id}" already exists.`);
      return;
    }

    const fieldDef: CustomFieldDefinition = {
      id,
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      options:
        newFieldType === 'select'
          ? newFieldOptions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined
    };

    setFields([...fields, fieldDef]);
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldOptions('');
    setError(null);
  };

  const handleRemoveField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }
    if (stages.length === 0) {
      setError('At least one lifecycle stage is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        await api.createTemplate({
          name: name.trim(),
          description: description.trim(),
          icon: 'FileText',
          stages,
          fields
        });
        setSuccessMsg('Template created successfully!');
      } else if (editingTemplate) {
        await api.updateTemplate(editingTemplate.id, {
          name: name.trim(),
          description: description.trim(),
          icon: editingTemplate.icon || 'FileText',
          stages,
          fields
        });
        setSuccessMsg('Template updated successfully!');
      }

      const refreshed = await api.listTemplates();
      onTemplatesUpdated(refreshed);
      setTimeout(() => {
        setEditingTemplate(null);
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteTemplate(id);
      const refreshed = await api.listTemplates();
      onTemplatesUpdated(refreshed);
    } catch (err: any) {
      alert(err.message || 'Cannot delete template: documents are currently using it.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
            Document Templates & Custom Schema Editor
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
            Configure what information your documents require and define their custom lifecycle stages.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => openEditor()}>
          <Plus size={16} /> Create Custom Template
        </button>
      </div>

      {/* Templates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {templates.map((tpl) => (
          <div key={tpl.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileSpreadsheet size={18} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEditor(tpl)}
                    title="Edit Template Schema"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    title="Delete Template"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.35rem' }}>
                {tpl.name}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '1rem', minHeight: '38px', lineHeight: 1.4 }}>
                {tpl.description || 'No description provided.'}
              </p>

              {/* Stages count & preview */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Layers size={13} /> {tpl.stages.length} Lifecycle Stages:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {tpl.stages.map((stg) => (
                    <span key={stg} className="badge" style={{ background: 'var(--bg-surface-elevated)', color: '#d1d5db', border: '1px solid var(--border-subtle)', fontSize: '0.7rem' }}>
                      {stg}
                    </span>
                  ))}
                </div>
              </div>

              {/* Fields count & preview */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sliders size={13} /> {tpl.fields.length} Custom Fields:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {tpl.fields.map((f) => (
                    <span key={f.id} className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.7rem' }}>
                      {f.name} ({f.type})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Editor Modal */}
      {editingTemplate && (
        <div className="modal-overlay" onClick={() => setEditingTemplate(null)}>
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                    {isNew ? 'Create Document Template' : `Edit Template: ${editingTemplate.name}`}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Define custom stages & information schema stored locally
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingTemplate(null)} style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
                {error && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--danger-bg)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: '8px',
                    color: 'var(--danger)',
                    fontSize: '0.8125rem'
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--success-bg)',
                    border: '1px solid var(--success-border)',
                    borderRadius: '8px',
                    color: 'var(--success)',
                    fontSize: '0.8125rem'
                  }}>
                    <Check size={16} style={{ flexShrink: 0 }} />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Name & Description */}
                <div className="form-group">
                  <label className="form-label required">Template / Category Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Purchase Order, Safety Inspection, Medical Record"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description & Usage Guidelines</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    placeholder="What kind of documents belong in this category?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Lifecycle Stages Section */}
                <div style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Lifecycle Stages Sequence ({stages.length})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Documents progress through these in order
                    </span>
                  </div>

                  {/* Stage tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    {stages.map((stage, idx) => (
                      <div
                        key={stage}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.35rem 0.65rem',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: '8px',
                          fontSize: '0.8125rem',
                          color: '#f8fafc'
                        }}
                      >
                        <span style={{ color: '#818cf8', fontWeight: 600 }}>{idx + 1}.</span>
                        <span>{stage}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(idx)}
                          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', padding: 0 }}
                          title="Remove stage"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Stage Input */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Add stage name (e.g. Quality Inspection, Dispatched)..."
                      value={newStageInput}
                      onChange={(e) => setNewStageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStage();
                        }
                      }}
                      style={{ fontSize: '0.8125rem', padding: '0.45rem 0.75rem' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddStage}
                      style={{ flexShrink: 0 }}
                    >
                      <Plus size={14} /> Add Stage
                    </button>
                  </div>
                </div>

                {/* Custom Fields Section */}
                <div style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Custom Information Fields ({fields.length})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Specific data required for this document type
                    </span>
                  </div>

                  {/* Configured fields list */}
                  {fields.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {fields.map((f) => (
                        <div
                          key={f.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            fontSize: '0.8125rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ color: '#f8fafc' }}>{f.name}</strong>
                            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.7rem' }}>
                              {f.type}
                            </span>
                            {f.required && (
                              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', fontSize: '0.7rem' }}>
                                Required
                              </span>
                            )}
                            {f.options && (
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                Options: [{f.options.join(', ')}]
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveField(f.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                            title="Remove field"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', padding: '0.5rem' }}>
                      No custom fields added yet. Add one below:
                    </div>
                  )}

                  {/* Add Field Box */}
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(17, 24, 39, 0.5)',
                    border: '1px dashed var(--border-medium)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Field Name (e.g. Vendor Name, Serial #)"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        style={{ fontSize: '0.8125rem', padding: '0.45rem 0.65rem' }}
                      />

                      <select
                        className="select"
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                        style={{ fontSize: '0.8125rem', padding: '0.45rem 0.65rem' }}
                      >
                        <option value="text">Text String</option>
                        <option value="number">Numeric Value</option>
                        <option value="date">Date Picker</option>
                        <option value="select">Dropdown Select</option>
                      </select>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#d1d5db', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                        />
                        Required
                      </label>
                    </div>

                    {newFieldType === 'select' && (
                      <input
                        type="text"
                        className="input"
                        placeholder="Dropdown Options (comma-separated, e.g. Open, Under Review, Closed)"
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        style={{ fontSize: '0.8125rem', padding: '0.45rem 0.65rem' }}
                      />
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddField}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      <Plus size={14} /> Add Field to Schema
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTemplate(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving Schema...' : isNew ? 'Create Template' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
