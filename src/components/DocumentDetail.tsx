import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  User as UserIcon,
  Calendar,
  Paperclip,
  Download,
  Edit3,
  ShieldCheck,
  History,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  Trash2,
  Building,
  Send,
  Printer,
  FileCheck
} from 'lucide-react';
import { DocumentRecord, DocumentHistoryRecord, Template, User } from '../types';
import { api } from '../api';
import { StageProgressBar } from './StageProgressBar';
import { AdvanceStageModal } from './AdvanceStageModal';
import { RouteDocumentModal } from './RouteDocumentModal';
import { RoutingSlipModal } from './RoutingSlipModal';

interface DocumentDetailProps {
  documentId: string;
  templates: Template[];
  users: User[];
  currentUser: User | null;
  lanUrl?: string;
  offices?: string[];
  actions?: string[];
  onBack: () => void;
  onDocumentUpdated: (doc: DocumentRecord) => void;
}

export const DocumentDetail: React.FC<DocumentDetailProps> = ({
  documentId,
  templates,
  users: _users,
  currentUser,
  lanUrl,
  offices,
  actions,
  onBack,
  onDocumentUpdated
}) => {
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [history, setHistory] = useState<DocumentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Edit custom fields state
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, [documentId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [docData, historyData] = await Promise.all([
        api.getDocument(documentId),
        api.getDocumentHistory(documentId)
      ]);
      setDoc(docData);
      setHistory(historyData);
      setEditValues(docData.custom_values || {});
      setEditTitle(docData.title);
    } catch (err: any) {
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!doc) return;
    navigator.clipboard.writeText(doc.tracking_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStageAdvanced = (updatedDoc: DocumentRecord) => {
    setDoc(updatedDoc);
    onDocumentUpdated(updatedDoc);
    api.getDocumentHistory(documentId).then(setHistory);
  };

  const handleDocumentRouted = (updatedDoc: DocumentRecord) => {
    setDoc(updatedDoc);
    onDocumentUpdated(updatedDoc);
    api.getDocumentHistory(documentId).then(setHistory);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;
    setSavingEdit(true);
    try {
      const updated = await api.updateDocument(doc.id, {
        title: editTitle.trim(),
        custom_values: editValues,
        author_name: currentUser ? currentUser.name : 'Authorized Staff',
        notes: editNotes.trim() || 'Updated document fields.'
      });
      setDoc(updated);
      onDocumentUpdated(updated);
      setShowEditModal(false);
      api.getDocumentHistory(documentId).then(setHistory);
    } catch (err: any) {
      alert(err.message || 'Failed to update document');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!doc || !currentUser) return;
    if (!confirm(`Admin Action: Permanently delete document "${doc.tracking_code} - ${doc.title}" and its complete audit history?`)) {
      return;
    }
    try {
      await api.deleteDocument(doc.id, currentUser.id);
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleDeleteHistoryEntry = async (historyId: string) => {
    if (!currentUser) return;
    if (!confirm('Admin Action: Permanently delete this audit log entry?')) {
      return;
    }
    try {
      await api.deleteHistoryEntry(historyId, currentUser.id);
      setHistory((prev) => prev.filter((h) => h.id !== historyId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete history entry');
    }
  };

  const template = templates.find((t) => t.id === doc?.template_id);
  const stages = template?.stages || [doc?.current_stage || 'Draft'];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeOnly = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#9ca3af' }}>
        Loading document tracking data...
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '500px' }}>
        <AlertCircle size={32} color="#f87171" style={{ margin: '0 auto 0.75rem' }} />
        <h3 style={{ color: '#f8fafc', marginBottom: '0.5rem' }}>Failed to Load Document</h3>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{error}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Registry
        </button>
      </div>
    );
  }

  const isAttachmentImage = doc.attachment_path && /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.attachment_path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* Top action bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={15} /> Back to Registry
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {currentUser?.role === 'Admin' && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteDocument} title="Admin: Delete document and all logs">
              <Trash2 size={14} /> Delete Record
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintModal(true)} title="Generate official 1-page transmittal slip">
            <Printer size={14} /> Print Routing Slip
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(true)}>
            <Edit3 size={14} /> Edit Fields
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowRouteModal(true)} style={{ background: '#4f46e5' }}>
            <Send size={14} /> Route Document
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdvanceModal(true)}>
            <ShieldCheck size={14} /> Advance Stage
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <span
                className="font-mono"
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#818cf8',
                  background: 'rgba(99, 102, 241, 0.12)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
                onClick={handleCopyCode}
                title="Click to copy tracking code"
              >
                {doc.tracking_code}
                {copiedCode ? <Check size={13} color="#34d399" /> : <Copy size={13} color="#818cf8" />}
              </span>

              <span className={`badge badge-priority-${doc.priority.toLowerCase()}`}>
                {doc.priority} Priority
              </span>

              {template && (
                <span className="badge" style={{ background: 'rgba(55, 65, 81, 0.5)', color: '#d1d5db' }}>
                  {template.name}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>
              {doc.title}
            </h1>
          </div>

          <div className="doc-detail-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={14} /> Registered: <strong style={{ color: '#f8fafc' }}>{formatDate(doc.created_at)}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={14} /> Last Updated: <strong style={{ color: '#f8fafc' }}>{formatDate(doc.updated_at)}</strong>
            </div>
          </div>
        </div>

        {/* Metadata info pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <UserIcon size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Created By</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>{doc.created_by_name}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <ShieldCheck size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Assigned Custodian</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
                {doc.assignee_name || 'Unassigned'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Current Status</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
                {doc.current_stage}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lifecycle Stage Progression Stepper */}
      <StageProgressBar
        stages={stages}
        currentStage={doc.current_stage}
        onAdvanceClick={() => setShowAdvanceModal(true)}
      />

      {/* LGU Department Custody & Action Required Banner */}
      <div className="card" style={{
        padding: '1.25rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(129, 140, 248, 0.25)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8',
            flexShrink: 0
          }}>
            <Building size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Municipal Custody
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.15rem' }}>
              {doc.current_office || 'Records & Archives Management'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
              Origin: <strong>{doc.originating_office}</strong> ({doc.origin_type || 'Internal Department'})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24',
            flexShrink: 0
          }}>
            <FileCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Action Required
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.15rem' }}>
              {doc.action_required || "For Mayor's Signature / Approval"}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.15rem' }}>
              Receiving department must act before next forwarding
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintModal(true)}>
            <Printer size={14} /> Print Slip
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowRouteModal(true)} style={{ background: '#4f46e5' }}>
            <Send size={14} /> Forward / Route
          </button>
        </div>
      </div>

      {/* Grid: Custom Template Information & Digital Attachment */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Custom Fields Card */}
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
              Configurable Field Values
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Schema: {template?.name || 'Custom'}
            </span>
          </div>

          {template && template.fields.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {template.fields.map((field) => {
                const val = doc.custom_values?.[field.id];
                return (
                  <div key={field.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#9ca3af', fontWeight: 500 }}>
                      {field.name}
                    </span>
                    <span
                      className={field.type === 'number' ? 'font-mono' : ''}
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: val !== undefined && val !== '' ? '#f8fafc' : '#6b7280',
                        textAlign: 'right',
                        wordBreak: 'break-word',
                        maxWidth: '60%'
                      }}
                    >
                      {val !== undefined && val !== '' ? String(val) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
              No custom schema fields configured for this template.
            </div>
          )}
        </div>

        {/* Attachment Card */}
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Paperclip size={16} color="#818cf8" /> Digital Attachment
            </h3>
            {doc.attachment_size && (
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {formatFileSize(doc.attachment_size)}
              </span>
            )}
          </div>

          {doc.attachment_path ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isAttachmentImage && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-medium)', background: '#000', maxHeight: '180px', display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={doc.attachment_path}
                    alt={doc.attachment_name || 'Attachment'}
                    style={{ maxHeight: '180px', objectFit: 'contain' }}
                  />
                </div>
              )}

              <div style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {doc.attachment_name || 'Document File'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Stored on local disk in ./uploads/
                  </div>
                </div>

                <a
                  href={doc.attachment_path}
                  download={doc.attachment_name || true}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6b7280' }}>
              <Paperclip size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500 }}>No digital file attached</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                Physical-only tracking or add attachment via Edit Fields
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Logs: Audit History & Chain of Custody Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(17, 24, 39, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
              Document Logs & Chain of Custody
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            {history.length} Immutable Log Entries
          </span>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{
                background: 'rgba(17, 24, 39, 0.7)',
                borderBottom: '1px solid var(--border-medium)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Date & Time</th>
                <th style={{ padding: '0.75rem 1rem', width: '140px' }}>Action</th>
                <th style={{ padding: '0.75rem 1rem', minWidth: '180px' }}>Custody & Routing</th>
                <th style={{ padding: '0.75rem 1rem', minWidth: '220px' }}>Action & Remarks</th>
                <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Authorized By</th>
                {currentUser?.role === 'Admin' && (
                  <th style={{ padding: '0.75rem 1rem', width: '48px', textAlign: 'center' }}></th>
                )}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={currentUser?.role === 'Admin' ? 6 : 5} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#9ca3af' }}>
                    No audit log entries recorded for this document yet.
                  </td>
                </tr>
              ) : (
                history.map((entry, idx) => (
                  <tr
                    key={entry.id || idx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                      verticalAlign: 'top'
                    }}
                  >
                    {/* Timestamp */}
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.8125rem' }}>
                        {formatDateOnly(entry.created_at)}
                      </div>
                      <div className="font-mono" style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                        {formatTimeOnly(entry.created_at)}
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      {entry.action === 'created' ? (
                        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                          <CheckCircle2 size={12} /> Ingested
                        </span>
                      ) : entry.action === 'routed' ? (
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          <Send size={12} /> Forwarded
                        </span>
                      ) : entry.action === 'stage_changed' ? (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <Check size={12} /> Advanced
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.3)' }}>
                          <Edit3 size={12} /> Modified
                        </span>
                      )}
                    </td>

                    {/* Routing / Office Custody */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {entry.action === 'routed' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>
                            {entry.from_office || 'Origin'}
                          </span>
                          <span style={{ color: '#818cf8', fontWeight: 700 }}>➔</span>
                          <span style={{ fontWeight: 600, color: '#818cf8' }}>
                            {entry.to_office || 'Destination'}
                          </span>
                        </div>
                      ) : entry.action === 'stage_changed' ? (
                        <div>
                          <span style={{ fontWeight: 600, color: '#34d399' }}>{entry.to_stage}</span>
                          {entry.from_stage && (
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.35rem' }}>
                              (from {entry.from_stage})
                            </span>
                          )}
                        </div>
                      ) : entry.action === 'created' ? (
                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                          Received at {entry.to_office || doc.originating_office}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>Record Details Updated</span>
                      )}
                    </td>

                    {/* Action Required & Remarks */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {entry.action_required && (
                        <div style={{ marginBottom: entry.notes ? '0.35rem' : '0' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            ⚡ {entry.action_required}
                          </span>
                        </div>
                      )}
                      {entry.notes ? (
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '0.8125rem',
                          fontStyle: 'italic',
                          lineHeight: '1.4'
                        }}>
                          "{entry.notes}"
                        </div>
                      ) : !entry.action_required ? (
                        <span style={{ color: '#6b7280' }}>—</span>
                      ) : null}
                    </td>

                    {/* Authorized By */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f8fafc', fontWeight: 500 }}>
                        <UserIcon size={14} color="#818cf8" style={{ flexShrink: 0 }} />
                        <span>{entry.author_name}</span>
                      </div>
                    </td>

                    {/* Admin Delete Action */}
                    {currentUser?.role === 'Admin' && (
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryEntry(entry.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            opacity: 0.8
                          }}
                          title="Admin: Delete this registry log entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showAdvanceModal && (
        <AdvanceStageModal
          document={doc}
          stages={stages}
          currentUser={currentUser}
          onSuccess={handleStageAdvanced}
          onClose={() => setShowAdvanceModal(false)}
        />
      )}

      {showRouteModal && (
        <RouteDocumentModal
          document={doc}
          currentUser={currentUser}
          offices={offices}
          actions={actions}
          onSuccess={handleDocumentRouted}
          onClose={() => setShowRouteModal(false)}
        />
      )}

      {showPrintModal && (
        <RoutingSlipModal
          document={doc}
          template={template}
          history={history}
          lanUrl={lanUrl}
          actions={actions}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {showEditModal && template && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                Edit Document Fields
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Document Title</label>
                  <input
                    type="text"
                    className="input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                {template.fields.map((f) => (
                  <div key={f.id} className="form-group">
                    <label className={`form-label ${f.required ? 'required' : ''}`}>{f.name}</label>
                    {f.type === 'select' ? (
                      <select
                        className="select"
                        value={editValues[f.id] || ''}
                        onChange={(e) => setEditValues({ ...editValues, [f.id]: e.target.value })}
                        required={f.required}
                      >
                        <option value="">-- Select option --</option>
                        {f.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : f.type === 'number' ? (
                      <input
                        type="number"
                        step="any"
                        className="input font-mono"
                        value={editValues[f.id] || ''}
                        onChange={(e) => setEditValues({ ...editValues, [f.id]: e.target.value })}
                        required={f.required}
                      />
                    ) : f.type === 'date' ? (
                      <input
                        type="date"
                        className="input"
                        value={editValues[f.id] || ''}
                        onChange={(e) => setEditValues({ ...editValues, [f.id]: e.target.value })}
                        required={f.required}
                      />
                    ) : (
                      <input
                        type="text"
                        className="input"
                        value={editValues[f.id] || ''}
                        onChange={(e) => setEditValues({ ...editValues, [f.id]: e.target.value })}
                        required={f.required}
                      />
                    )}
                  </div>
                ))}

                <div className="form-group">
                  <label className="form-label">Audit Note for Edit</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Reason for modifying values..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={savingEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Saving Changes...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
