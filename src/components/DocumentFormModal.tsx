import React, { useState } from 'react';
import { X, Plus, Upload, AlertCircle, Paperclip, Building } from 'lucide-react';
import {
  Template,
  User,
  DocumentRecord,
  PriorityLevel,
  MUNICIPAL_OFFICES,
  ACTION_REQUIRED_OPTIONS,
  OriginType
} from '../types';
import { api } from '../api';

interface DocumentFormModalProps {
  templates: Template[];
  users: User[];
  currentUser: User | null;
  offices?: string[];
  actions?: string[];
  onSuccess: (newDoc: DocumentRecord) => void;
  onClose: () => void;
}

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  templates,
  users,
  currentUser,
  offices,
  actions,
  onSuccess,
  onClose
}) => {
  const officeList = offices && offices.length > 0 ? offices : MUNICIPAL_OFFICES;
  const actionList = actions && actions.length > 0 ? actions : ACTION_REQUIRED_OPTIONS;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Normal');
  const [originType, setOriginType] = useState<OriginType>('Internal Department');
  const [originatingOffice, setOriginatingOffice] = useState<string>(
    currentUser?.department || officeList[0] || 'Records & Archives Management'
  );
  const [currentOffice, setCurrentOffice] = useState<string>(
    currentUser?.department || officeList[0] || 'Records & Archives Management'
  );
  const [actionRequired, setActionRequired] = useState<string>(actionList[0] || ACTION_REQUIRED_OPTIONS[0]);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<{
    path: string;
    name: string;
    size: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadFile(file);
      setUploadedFile({
        path: res.file_path,
        name: res.file_name,
        size: res.file_size
      });
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedTemplateId) {
      setError('Document title and template are required');
      return;
    }

    // Check required custom fields
    if (activeTemplate) {
      for (const field of activeTemplate.fields) {
        if (field.required && !customValues[field.id]) {
          setError(`Field "${field.name}" is required.`);
          return;
        }
      }
    }

    setLoading(true);
    setError(null);

    const selectedAssignee = users.find((u) => u.id === assigneeId);

    try {
      const created = await api.createDocument({
        title: title.trim(),
        template_id: selectedTemplateId,
        priority,
        origin_type: originType,
        originating_office: originatingOffice.trim() || 'Records & Archives Management',
        current_office: currentOffice || 'Records & Archives Management',
        action_required: actionRequired || ACTION_REQUIRED_OPTIONS[0],
        assignee_id: assigneeId || null,
        assignee_name: selectedAssignee ? selectedAssignee.name : null,
        custom_values: customValues,
        attachment_path: uploadedFile?.path || null,
        attachment_name: uploadedFile?.name || null,
        attachment_size: uploadedFile?.size || null,
        author_name: currentUser ? currentUser.name : 'System User',
        notes: notes.trim() || undefined
      });

      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
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
              <Plus size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                Register New Document
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Initiate lifecycle tracking and assign custom schema
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '0.35rem' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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

            {/* Template Selector */}
            <div className="form-group">
              <label className="form-label required">Document Type / Template</label>
              <select
                className="select"
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  setCustomValues({});
                }}
                required
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} — ({tpl.stages.join(' → ')})
                  </option>
                ))}
              </select>
              {activeTemplate?.description && (
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {activeTemplate.description}
                </span>
              )}
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label required">Document Title / Subject</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Master Services Agreement with Oracle Global"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Priority & Assignee Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label required">Priority Level</label>
                <select
                  className="select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Custodian / Reviewer</label>
                <select
                  className="select"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LGU Document Origin & Custodial Routing Section */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(129, 140, 248, 0.2)',
              borderRadius: '10px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <Building size={14} /> LGU Routing & Custodial Assignment
              </div>

              {/* Origin Type */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label required">Document Origin Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${originType === 'Internal Department' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setOriginType('Internal Department');
                      if (currentUser) setOriginatingOffice(currentUser.department);
                    }}
                    style={{ fontSize: '0.75rem', justifyContent: 'center' }}
                  >
                    🏢 Internal Department
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${originType === 'External / Citizen / Barangay' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setOriginType('External / Citizen / Barangay');
                      setOriginatingOffice('');
                    }}
                    style={{ fontSize: '0.75rem', justifyContent: 'center' }}
                  >
                    👥 External / Citizen / Barangay
                  </button>
                </div>
              </div>

              {/* Originating Office / Entity Name */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label required">
                  {originType === 'Internal Department' ? 'Originating Department' : 'Filing Party / Barangay / Citizen Name'}
                </label>
                <input
                  type="text"
                  className="input"
                  list="municipal-offices-list"
                  placeholder={originType === 'Internal Department' ? 'e.g. Sangguniang Bayan, City Health Office' : 'e.g. Barangay San Antonio, Citizen Juan Dela Cruz'}
                  value={originatingOffice}
                  onChange={(e) => setOriginatingOffice(e.target.value)}
                  required
                />
                <datalist id="municipal-offices-list">
                  {officeList.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>

              {/* Receiving Holding Office & Action Required Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label required">Initial Office Custody</label>
                  <select
                    className="select"
                    value={currentOffice}
                    onChange={(e) => setCurrentOffice(e.target.value)}
                    required
                  >
                    {officeList.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label required">Immediate Action Required</label>
                  <select
                    className="select"
                    value={actionRequired}
                    onChange={(e) => setActionRequired(e.target.value)}
                    required
                  >
                    {actionList.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dynamic Custom Fields Section */}
            {activeTemplate && activeTemplate.fields.length > 0 && (
              <div style={{
                background: 'rgba(17, 24, 39, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#818cf8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Configurable Fields ({activeTemplate.name})
                </div>

                {activeTemplate.fields.map((field) => (
                  <div key={field.id} className="form-group">
                    <label className={`form-label ${field.required ? 'required' : ''}`}>
                      {field.name}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        className="select"
                        value={customValues[field.id] || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        required={field.required}
                      >
                        <option value="">-- Select option --</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        step="any"
                        className="input font-mono"
                        placeholder="0.00"
                        value={customValues[field.id] || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        required={field.required}
                      />
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        className="input"
                        value={customValues[field.id] || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        required={field.required}
                      />
                    ) : (
                      <input
                        type="text"
                        className="input"
                        placeholder={`Enter ${field.name.toLowerCase()}...`}
                        value={customValues[field.id] || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Optional Digital Attachment Upload */}
            <div className="form-group">
              <label className="form-label">Digital Attachment (Optional PDF / Scan / Image)</label>
              {uploadedFile ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <Paperclip size={16} color="#34d399" />
                    <span style={{ fontSize: '0.8125rem', color: '#f8fafc', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {uploadedFile.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      ({formatFileSize(uploadedFile.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setUploadedFile(null)}
                    style={{ padding: '0.2rem 0.4rem' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  border: '1px dashed var(--border-medium)',
                  borderRadius: '8px',
                  background: 'var(--bg-surface-elevated)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease'
                }}>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Upload size={20} color="#818cf8" style={{ marginBottom: '0.25rem' }} />
                  <span style={{ fontSize: '0.8125rem', color: '#f8fafc', fontWeight: 500 }}>
                    {uploading ? 'Uploading attachment...' : 'Click or Drag to Upload Local Attachment'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    PDF, JPG, PNG, DOCX stored locally on server (max 25MB)
                  </span>
                </label>
              )}
            </div>

            {/* Initial Notes */}
            <div className="form-group">
              <label className="form-label">Initial Registration Notes</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Optional notes or context for the audit log..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
              <Plus size={16} />
              <span>{loading ? 'Creating Document...' : 'Create & Track Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
