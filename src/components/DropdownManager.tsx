import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  ShieldAlert,
  Building,
  CheckSquare,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Flag
} from 'lucide-react';
import { User, Template, DropdownsData } from '../types';
import { api } from '../api';

interface DropdownManagerProps {
  currentUser: User | null;
  templates: Template[];
  onTemplatesUpdated?: (templates: Template[]) => void;
  onDropdownsUpdated?: () => void;
}

export const DropdownManager: React.FC<DropdownManagerProps> = ({
  currentUser,
  templates,
  onTemplatesUpdated,
  onDropdownsUpdated
}) => {
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const [loading, setLoading] = useState(true);
  const [dropdowns, setDropdowns] = useState<DropdownsData>({});
  const [activeCategory, setActiveCategory] = useState<string>('offices');
  
  // Working copy of current category's options
  const [workingOptions, setWorkingOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Template select fields state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [templateFieldOptions, setTemplateFieldOptions] = useState<string[]>([]);
  const [newTemplateOptionInput, setNewTemplateOptionInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadDropdowns();
  }, []);

  const loadDropdowns = async () => {
    setLoading(true);
    try {
      const data = await api.getDropdowns();
      setDropdowns(data);
      if (data[activeCategory]) {
        setWorkingOptions([...data[activeCategory].options]);
      }
    } catch (err: any) {
      console.error('Failed to load dropdowns:', err);
      setStatusMsg({ type: 'error', text: 'Failed to load dropdown data from server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (catKey: string) => {
    setActiveCategory(catKey);
    setStatusMsg(null);
    setEditingIndex(null);
    setNewOptionInput('');

    if (catKey === 'templates') {
      // Find first template with a select field
      const tWithSelect = templates.find((t) => t.fields.some((f) => f.type === 'select'));
      if (tWithSelect) {
        setSelectedTemplateId(tWithSelect.id);
        const firstField = tWithSelect.fields.find((f) => f.type === 'select');
        if (firstField) {
          setSelectedFieldId(firstField.id);
          setTemplateFieldOptions([...(firstField.options || [])]);
        }
      }
    } else if (dropdowns[catKey]) {
      setWorkingOptions([...dropdowns[catKey].options]);
    }
  };

  // Add option to current category
  const handleAddOption = () => {
    const val = newOptionInput.trim();
    if (!val) return;
    if (workingOptions.includes(val)) {
      setStatusMsg({ type: 'error', text: `"${val}" already exists in this dropdown.` });
      return;
    }
    setWorkingOptions([...workingOptions, val]);
    setNewOptionInput('');
    setStatusMsg(null);
  };

  // Inline edit
  const handleSaveEdit = (idx: number) => {
    const val = editingText.trim();
    if (!val) return;
    const updated = [...workingOptions];
    updated[idx] = val;
    setWorkingOptions(updated);
    setEditingIndex(null);
    setEditingText('');
  };

  // Remove option
  const handleRemoveOption = (idx: number) => {
    if (workingOptions.length <= 1) {
      setStatusMsg({ type: 'error', text: 'A dropdown must have at least one option.' });
      return;
    }
    const updated = workingOptions.filter((_, i) => i !== idx);
    setWorkingOptions(updated);
  };

  // Move option up / down
  const handleMove = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= workingOptions.length) return;
    const updated = [...workingOptions];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, moved);
    setWorkingOptions(updated);
  };

  // Save changes to backend
  const handleSaveChanges = async () => {
    if (!currentUser || !isAdmin) {
      setStatusMsg({ type: 'error', text: 'Permission denied: Only Admin role can edit dropdown data.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.updateDropdown(activeCategory, workingOptions, currentUser.id);
      setDropdowns((prev) => ({
        ...prev,
        [activeCategory]: res.dropdown
      }));
      setStatusMsg({ type: 'success', text: `Saved ${workingOptions.length} options for "${res.dropdown.label}" successfully.` });
      if (onDropdownsUpdated) onDropdownsUpdated();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save dropdown options.' });
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (!currentUser || !isAdmin) return;
    if (!window.confirm(`Are you sure you want to reset "${dropdowns[activeCategory]?.label || activeCategory}" to default municipal values?`)) {
      return;
    }

    setSaving(true);
    try {
      const res = await api.resetDropdown(activeCategory, currentUser.id);
      setDropdowns((prev) => ({
        ...prev,
        [activeCategory]: res.dropdown
      }));
      setWorkingOptions([...res.dropdown.options]);
      setStatusMsg({ type: 'success', text: `Reset "${res.dropdown.label}" to system defaults.` });
      if (onDropdownsUpdated) onDropdownsUpdated();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reset dropdown options.' });
    } finally {
      setSaving(false);
    }
  };

  // Handle template custom field dropdown saving
  const handleTemplateSelectionChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      const selectFields = tpl.fields.filter((f) => f.type === 'select');
      if (selectFields.length > 0) {
        setSelectedFieldId(selectFields[0].id);
        setTemplateFieldOptions([...(selectFields[0].options || [])]);
      } else {
        setSelectedFieldId('');
        setTemplateFieldOptions([]);
      }
    }
  };

  const handleFieldSelectionChange = (fId: string) => {
    setSelectedFieldId(fId);
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    const f = tpl?.fields.find((field) => field.id === fId);
    if (f) {
      setTemplateFieldOptions([...(f.options || [])]);
    }
  };

  const handleAddTemplateOption = () => {
    const val = newTemplateOptionInput.trim();
    if (!val) return;
    if (templateFieldOptions.includes(val)) {
      setStatusMsg({ type: 'error', text: `"${val}" already exists.` });
      return;
    }
    setTemplateFieldOptions([...templateFieldOptions, val]);
    setNewTemplateOptionInput('');
  };

  const handleRemoveTemplateOption = (idx: number) => {
    setTemplateFieldOptions(templateFieldOptions.filter((_, i) => i !== idx));
  };

  const handleSaveTemplateFieldOptions = async () => {
    if (!currentUser || !isAdmin) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl || !selectedFieldId) return;

    setSaving(true);
    setStatusMsg(null);
    try {
      const updatedFields = tpl.fields.map((f) => {
        if (f.id === selectedFieldId) {
          return { ...f, options: templateFieldOptions };
        }
        return f;
      });

      const updated = await api.updateTemplate(tpl.id, {
        name: tpl.name,
        description: tpl.description || '',
        icon: tpl.icon,
        stages: tpl.stages,
        fields: updatedFields
      });

      if (onTemplatesUpdated) {
        onTemplatesUpdated(templates.map((t) => (t.id === updated.id ? updated : t)));
      }
      setStatusMsg({ type: 'success', text: `Successfully updated template field dropdown options.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update template field dropdown.' });
    } finally {
      setSaving(false);
    }
  };

  // If not admin, render restricted notice
  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '2rem auto',
        padding: '2.5rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: '16px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}>
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Admin Role Required
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.5', maxWidth: '460px', margin: '0 auto 1.5rem' }}>
          Dropdown management is restricted to authorized <strong>System Administrators</strong>. Your active account is currently signed in as <strong>{currentUser?.name || 'Guest Staff'}</strong> ({currentUser?.role || 'Staff'}).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af', fontSize: '0.875rem' }}>
        Loading municipal dropdown configuration...
      </div>
    );
  }

  const categories = [
    { key: 'offices', label: 'Municipal Offices & Departments', icon: Building },
    { key: 'actions', label: 'Action Required Directives', icon: CheckSquare },
    { key: 'priorities', label: 'Priority Levels', icon: Flag },
    { key: 'origin_types', label: 'Origin Types', icon: Layers },
    { key: 'templates', label: 'Template Custom Fields', icon: FileSpreadsheet }
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: '16px',
        padding: '1.25rem 1.75rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Settings size={18} />
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Dropdown Data Management
            </h1>
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 700 }}>
              Admin Only
            </span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.8125rem', marginTop: '0.35rem' }}>
            Customize all master dropdown options, office routing queues, transmittal actions, and template select fields across the entire municipal system.
          </p>
        </div>

        {activeCategory !== 'templates' && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleResetDefaults}
              disabled={saving}
              title="Reset current dropdown to factory LGU defaults"
            >
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveChanges}
              disabled={saving}
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {statusMsg && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.8125rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: statusMsg.type === 'success' ? '#4ade80' : '#f87171',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <AlertCircle size={16} />
          <span>{statusMsg.text}</span>
          <button
            onClick={() => setStatusMsg(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          const count = cat.key === 'templates'
            ? templates.reduce((acc, t) => acc + t.fields.filter((f) => f.type === 'select').length, 0)
            : dropdowns[cat.key]?.options?.length ?? 0;

          return (
            <button
              key={cat.key}
              onClick={() => handleSelectCategory(cat.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '1rem',
                borderRadius: '12px',
                border: isActive ? '1px solid #6366f1' : '1px solid var(--border-medium)',
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                color: isActive ? '#f8fafc' : '#9ca3af',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.4rem' }}>
                <Icon size={18} color={isActive ? '#818cf8' : '#9ca3af'} />
                <span className="badge" style={{
                  background: isActive ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.7rem'
                }}>
                  {count} {cat.key === 'templates' ? 'fields' : 'items'}
                </span>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isActive ? '#f8fafc' : '#d1d5db' }}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Body: System Dropdown Editor */}
      {activeCategory !== 'templates' ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* Active Category Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {dropdowns[activeCategory]?.label || activeCategory}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Total items: {workingOptions.length} | Drag or click arrows to reorder.
              </span>
            </div>
          </div>

          {/* Quick Add Form */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="input"
              placeholder={`Enter new ${dropdowns[activeCategory]?.label || 'option'} name...`}
              value={newOptionInput}
              onChange={(e) => setNewOptionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleAddOption} type="button">
              <Plus size={16} /> Add Option
            </button>
          </div>

          {/* Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {workingOptions.map((opt, idx) => {
              const isEditing = editingIndex === idx;

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 1rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginRight: '0.75rem' }}>
                      <input
                        type="text"
                        className="input"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(idx);
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        autoFocus
                        style={{ fontSize: '0.875rem', padding: '0.35rem 0.6rem' }}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSaveEdit(idx)}
                        title="Save edit"
                      >
                        <Check size={14} color="#4ade80" />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingIndex(null)}
                        title="Cancel"
                      >
                        <X size={14} color="#9ca3af" />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#6b7280',
                        width: '24px',
                        textAlign: 'center'
                      }}>
                        {idx + 1}.
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#f8fafc' }}>
                        {opt}
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {/* Reorder Buttons */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        style={{ padding: '0.25rem 0.45rem', opacity: idx === 0 ? 0.3 : 1 }}
                        title="Move Up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === workingOptions.length - 1}
                        style={{ padding: '0.25rem 0.45rem', opacity: idx === workingOptions.length - 1 ? 0.3 : 1 }}
                        title="Move Down"
                      >
                        <ArrowDown size={13} />
                      </button>

                      {/* Edit Button */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditingIndex(idx);
                          setEditingText(opt);
                        }}
                        style={{ padding: '0.25rem 0.45rem' }}
                        title="Edit text"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete Button */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRemoveOption(idx)}
                        style={{ padding: '0.25rem 0.45rem', color: '#ef4444' }}
                        title="Delete option"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Body: Template Custom Field Dropdown Editor */
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Template Custom Field Dropdown Options
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Select an official document template and choose a dropdown-type field to configure its choices.
            </span>
          </div>

          {/* Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.4rem' }}>
                Document Template:
              </label>
              <select
                className="select"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelectionChange(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.fields.filter((f) => f.type === 'select').length} dropdown fields)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.4rem' }}>
                Dropdown Field:
              </label>
              <select
                className="select"
                value={selectedFieldId}
                onChange={(e) => handleFieldSelectionChange(e.target.value)}
                disabled={!selectedTemplateId}
              >
                {(() => {
                  const t = templates.find((tpl) => tpl.id === selectedTemplateId);
                  const selFields = t?.fields.filter((f) => f.type === 'select') || [];
                  if (selFields.length === 0) {
                    return <option value="">No dropdown fields in this template</option>;
                  }
                  return selFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.options?.length || 0} choices)
                    </option>
                  ));
                })()}
              </select>
            </div>
          </div>

          {selectedFieldId ? (
            <>
              {/* Add option */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Add new dropdown choice..."
                  value={newTemplateOptionInput}
                  onChange={(e) => setNewTemplateOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTemplateOption();
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={handleAddTemplateOption} type="button">
                  <Plus size={16} /> Add Choice
                </button>
              </div>

              {/* Template Field Options List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {templateFieldOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.85rem',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px'
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', color: '#f8fafc' }}>
                      {idx + 1}. {opt}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRemoveTemplateOption(idx)}
                      style={{ color: '#ef4444', padding: '0.2rem 0.4rem' }}
                      title="Remove choice"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveTemplateFieldOptions}
                  disabled={saving}
                >
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Template Field Options'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
              The selected template does not have any custom fields configured as a dropdown select.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
