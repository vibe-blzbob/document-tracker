import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  FileText,
  Paperclip,
  ChevronRight,
  Clock,
  User,
  ArrowUpDown,
  Trash2,
  Building
} from 'lucide-react';
import { DocumentRecord, Template, User as UserType, MUNICIPAL_OFFICES } from '../types';

interface DocumentListProps {
  documents: DocumentRecord[];
  templates: Template[];
  currentUser?: UserType | null;
  offices?: string[];
  onSelectDocument: (docId: string) => void;
  onOpenCreateModal: () => void;
  onDeleteDocument?: (docId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  templates,
  currentUser,
  offices,
  onSelectDocument,
  onOpenCreateModal,
  onDeleteDocument
}) => {
  const officeList = offices && offices.length > 0 ? offices : MUNICIPAL_OFFICES;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Collect all unique stages across templates
  const allStages = Array.from(new Set(templates.flatMap((t) => t.stages)));

  // Filter documents
  const filtered = documents.filter((doc) => {
    if (selectedTemplate && doc.template_id !== selectedTemplate) return false;
    if (selectedOffice && doc.current_office !== selectedOffice) return false;
    if (selectedStage && doc.current_stage !== selectedStage) return false;
    if (selectedPriority && doc.priority !== selectedPriority) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(term);
      const matchCode = doc.tracking_code.toLowerCase().includes(term);
      const matchOffice = (doc.current_office || '').toLowerCase().includes(term);
      const matchOrigin = (doc.originating_office || '').toLowerCase().includes(term);
      const matchAction = (doc.action_required || '').toLowerCase().includes(term);
      const matchValues = JSON.stringify(doc.custom_values || {}).toLowerCase().includes(term);
      if (!matchTitle && !matchCode && !matchOffice && !matchOrigin && !matchAction && !matchValues) return false;
    }
    return true;
  });

  const getTemplate = (id: string) => templates.find((t) => t.id === id);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Search and Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{
          position: 'relative',
          flex: '1 1 300px',
          maxWidth: '450px'
        }}>
          <Search
            size={16}
            color="#9ca3af"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search tracking code, title, office, action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          <Plus size={16} /> Track New Document
        </button>
      </div>

      {/* Filter Ribbon */}
      <div className="filter-ribbon">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: '#9ca3af' }}>
          <Filter size={14} /> Filters:
        </div>

        {/* Office Queue Filter */}
        <select
          className="select filter-select"
          value={selectedOffice}
          onChange={(e) => setSelectedOffice(e.target.value)}
          style={{ minWidth: '160px' }}
        >
          <option value="">All Municipal Offices</option>
          {officeList.map((office) => (
            <option key={office} value={office}>{office}</option>
          ))}
        </select>

        {/* Template Filter */}
        <select
          className="select filter-select"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
        >
          <option value="">All Document Types</option>
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
          ))}
        </select>

        {/* Stage Filter */}
        <select
          className="select filter-select"
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
        >
          <option value="">All Lifecycle Stages</option>
          {allStages.map((stg) => (
            <option key={stg} value={stg}>{stg}</option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          className="select filter-select"
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Normal">Normal</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>

        {(selectedTemplate || selectedOffice || selectedStage || selectedPriority || searchTerm) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedTemplate('');
              setSelectedOffice('');
              setSelectedStage('');
              setSelectedPriority('');
              setSearchTerm('');
            }}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            Clear Filters
          </button>
        )}

        <div className="filter-count">
          Showing <strong>{filtered.length}</strong> of {documents.length} records
        </div>
      </div>

      {/* Document List Table / Card View */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#9ca3af' }}>
          <FileText size={36} color="#6b7280" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.4rem' }}>
            No Matching Documents Found
          </h3>
          <p style={{ fontSize: '0.8125rem', maxWidth: '360px', margin: '0 auto 1.25rem' }}>
            {searchTerm || selectedTemplate || selectedStage || selectedPriority
              ? 'Try adjusting or clearing your search filters to find what you need.'
              : 'Start tracking physical or digital files on this local network server.'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={onOpenCreateModal}>
            <Plus size={15} /> Track First Document
          </button>
        </div>
      ) : (
        <div className="card doc-table-container">
          {/* Table Header (Desktop) */}
          <div className="doc-table-header">
            <div>Tracking Code</div>
            <div>Document Title & Type</div>
            <div>Current Stage</div>
            <div>Priority</div>
            <div>Custodian</div>
            <div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Updated <ArrowUpDown size={12} />
              </span>
            </div>
            <div></div>
          </div>

          {/* Rows (Adaptive Table on Desktop, Cards on Mobile) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((doc) => {
              const tpl = getTemplate(doc.template_id);
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(doc.id)}
                  className="doc-table-row table-row-hover"
                >
                  {/* Mobile Top Row */}
                  <div className="doc-mobile-header">
                    <span className="font-mono doc-col-code">
                      {doc.tracking_code}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span className={`badge badge-priority-${doc.priority.toLowerCase()}`}>
                        {doc.priority}
                      </span>
                      <span className="badge doc-badge-stage">
                        {doc.current_stage}
                      </span>
                      {currentUser?.role === 'Admin' && onDeleteDocument && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.2rem 0.45rem', marginLeft: '0.25rem' }}
                          title="Admin: Delete registry document"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Admin Action: Permanently delete "${doc.tracking_code} - ${doc.title}" and all its audit logs?`)) {
                              onDeleteDocument(doc.id);
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desktop Tracking Code */}
                  <div className="font-mono doc-desktop-code">
                    {doc.tracking_code}
                  </div>

                  {/* Title & Template & LGU Office */}
                  <div className="doc-col-title">
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      minWidth: 0
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={doc.title}>
                        {doc.title}
                      </span>
                      {doc.attachment_path && (
                        <span title="Contains local attachment" style={{ display: 'inline-flex', flexShrink: 0 }}>
                          <Paperclip size={13} color="#34d399" />
                        </span>
                      )}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      marginTop: '0.2rem',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
                        {tpl?.name || 'Custom Document'}
                      </span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.7rem',
                        color: '#93c5fd',
                        background: 'rgba(59, 130, 246, 0.12)',
                        padding: '0.05rem 0.4rem',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}>
                        <Building size={10} /> {doc.current_office || 'Records'}
                      </span>
                      {doc.action_required && (
                        <span style={{
                          fontSize: '0.675rem',
                          color: '#fbbf24',
                          background: 'rgba(245, 158, 11, 0.12)',
                          padding: '0.05rem 0.35rem',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '160px',
                          flexShrink: 1
                        }}>
                          ⚡ {doc.action_required}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop Stage */}
                  <div className="doc-desktop-stage">
                    <span
                      className="badge doc-badge-stage"
                      style={{
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'inline-block'
                      }}
                      title={doc.current_stage}
                    >
                      {doc.current_stage}
                    </span>
                  </div>

                  {/* Desktop Priority */}
                  <div className="doc-desktop-priority">
                    <span className={`badge badge-priority-${doc.priority.toLowerCase()}`}>
                      {doc.priority}
                    </span>
                  </div>

                  {/* Desktop Custodian */}
                  <div className="doc-desktop-custodian">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: '#d1d5db', minWidth: 0 }}>
                      <User size={13} color="#9ca3af" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={doc.assignee_name || 'Unassigned'}>
                        {doc.assignee_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {/* Custodian & Timestamp (Adaptive) */}
                  <div className="doc-col-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: '#d1d5db' }}>
                      <User size={13} color="#9ca3af" />
                      <span>{doc.assignee_name || 'Unassigned'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                      <Clock size={12} />
                      <span>{formatDate(doc.updated_at)}</span>
                    </div>
                  </div>

                  {/* Desktop Updated Column */}
                  <div className="doc-desktop-updated">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      <Clock size={12} style={{ flexShrink: 0 }} />
                      <span>{formatDate(doc.updated_at)}</span>
                    </div>
                  </div>

                  {/* Arrow or Admin Delete */}
                  <div className="doc-col-arrow">
                    {currentUser?.role === 'Admin' && onDeleteDocument ? (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.25rem 0.45rem' }}
                        title="Admin: Delete record from registry"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Admin Action: Permanently delete "${doc.tracking_code} - ${doc.title}" and all its audit logs?`)) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
