import React from 'react';
import { X, Printer, CheckSquare, Square } from 'lucide-react';
import { generateQRMatrix } from './QRCodeModal';
import { DocumentRecord, DocumentHistoryRecord, Template, ACTION_REQUIRED_OPTIONS } from '../types';

interface RoutingSlipModalProps {
  document: DocumentRecord;
  template?: Template;
  history: DocumentHistoryRecord[];
  lanUrl?: string;
  actions?: string[];
  onClose: () => void;
}

export const RoutingSlipModal: React.FC<RoutingSlipModalProps> = ({
  document,
  template,
  history,
  lanUrl,
  actions,
  onClose
}) => {
  const actionList = actions && actions.length > 0 ? actions : ACTION_REQUIRED_OPTIONS;

  const handlePrint = () => {
    window.print();
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // QR link points directly to the document detail page over LAN
  const qrTargetUrl = lanUrl ? `${lanUrl}?doc=${document.id}` : window.location.href;

  // Filter routing entries from history
  const routingHistory = history.filter(
    (h) => h.action === 'routed' || h.action === 'created' || h.action === 'stage_changed'
  );

  return (
    <div className="modal-backdrop routing-slip-backdrop">
      <div className="card modal-content routing-slip-modal-container" style={{ maxWidth: '820px', width: '95vw', padding: '0' }}>
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.95)'
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={16} color="#818cf8" /> Official LGU Document Routing Slip Preview
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Formatted for 1-page standard paper transmittal. Click print or press Ctrl+P.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={14} /> Print Routing Slip
            </button>
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.4rem', borderRadius: '50%' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Paper Document Sheet */}
        <div className="printable-routing-slip" style={{
          padding: '2rem',
          background: '#ffffff',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
              Republic of the Philippines
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Local Government Unit • Office of the Municipal / City Administrator
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginTop: '0.35rem', letterSpacing: '0.02em' }}>
              DOCUMENT ROUTING & TRANSMITTAL SLIP
            </div>
          </div>

          {/* Top Metadata Grid + QR */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '1.25rem',
            border: '1.5px solid #0f172a',
            padding: '0.875rem',
            marginBottom: '1rem',
            alignItems: 'center'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 1rem', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ fontWeight: 700, color: '#475569', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  Document Tracking No.
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                  {document.tracking_code}
                </span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: '#475569', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  Date & Time Ingested
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {formatDateTime(document.created_at)}
                </span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: '#475569', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  Originating Office / Entity
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {document.originating_office}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                  ({document.origin_type})
                </span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: '#475569', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  Document Classification
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {template?.name || 'Official LGU Record'}
                </span>
                <span style={{
                  display: 'inline-block',
                  marginLeft: '0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                  background: document.priority === 'Urgent' ? '#fee2e2' : '#f1f5f9',
                  color: document.priority === 'Urgent' ? '#991b1b' : '#334155'
                }}>
                  {document.priority} Priority
                </span>
              </div>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: 'center', paddingLeft: '1rem', borderLeft: '1px solid #cbd5e1' }}>
              {(() => {
                const matrix = generateQRMatrix(qrTargetUrl);
                return (
                  <svg
                    viewBox="0 0 25 25"
                    width={76}
                    height={76}
                    shapeRendering="crispEdges"
                    style={{ display: 'block', margin: '0 auto' }}
                  >
                    <rect width="25" height="25" fill="#ffffff" />
                    {matrix.map((row, r) =>
                      row.map((cell, c) =>
                        cell ? (
                          <rect
                            key={`${r}-${c}`}
                            x={c}
                            y={r}
                            width="1"
                            height="1"
                            fill="#0f172a"
                          />
                        ) : null
                      )
                    )}
                  </svg>
                );
              })()}
              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                SCAN TO TRACK
              </span>
            </div>
          </div>

          {/* Subject / Title */}
          <div style={{ border: '1.5px solid #0f172a', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
            <span style={{ fontWeight: 700, color: '#475569', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Document Subject / Particulars
            </span>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: '1.4' }}>
              {document.title}
            </div>

            {/* Custom Values Summary if any */}
            {document.custom_values && Object.keys(document.custom_values).length > 0 && (
              <div style={{
                marginTop: '0.5rem',
                paddingTop: '0.5rem',
                borderTop: '1px dashed #cbd5e1',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem 1.5rem',
                fontSize: '0.75rem'
              }}>
                {Object.entries(document.custom_values).map(([key, val]) => (
                  <div key={key}>
                    <span style={{ color: '#64748b', textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}:
                    </span>{' '}
                    <strong style={{ color: '#1e293b' }}>
                      {typeof val === 'number' && key.toLowerCase().includes('amount')
                        ? `PHP ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : String(val)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Required Checklist */}
          <div style={{ border: '1.5px solid #0f172a', padding: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 800, color: '#0f172a', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Action Required Checklist
            </span>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.35rem 0.75rem',
              fontSize: '0.75rem'
            }}>
              {actionList.map((action) => {
                const isSelected = document.action_required === action;
                return (
                  <div key={action} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isSelected ? (
                      <CheckSquare size={13} color="#0f172a" style={{ flexShrink: 0 }} />
                    ) : (
                      <Square size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                    )}
                    <span style={{ fontWeight: isSelected ? 700 : 400, color: isSelected ? '#0f172a' : '#475569' }}>
                      {action}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Routing Custody Handover Table */}
          <div style={{ border: '1.5px solid #0f172a', marginBottom: '1rem' }}>
            <div style={{
              background: '#f1f5f9',
              padding: '0.4rem 0.6rem',
              fontWeight: 800,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              borderBottom: '1px solid #0f172a'
            }}>
              Custodial Handover & Routing History Log
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '0.4rem 0.5rem', width: '120px' }}>Date/Time</th>
                  <th style={{ padding: '0.4rem 0.5rem', width: '130px' }}>From Office</th>
                  <th style={{ padding: '0.4rem 0.5rem', width: '130px' }}>To Office</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Action / Notes</th>
                  <th style={{ padding: '0.4rem 0.5rem', width: '110px' }}>Released By</th>
                  <th style={{ padding: '0.4rem 0.5rem', width: '110px' }}>Received (Sign)</th>
                </tr>
              </thead>
              <tbody>
                {routingHistory.map((step, idx) => (
                  <tr key={step.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      {formatDateTime(step.created_at)}
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', fontWeight: 600 }}>
                      {step.from_office || document.originating_office}
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', fontWeight: 600 }}>
                      {step.to_office || document.current_office}
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', color: '#334155' }}>
                      <strong>{step.action_required || step.to_stage || step.action}:</strong> {step.notes || ''}
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem' }}>
                      {step.author_name}
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', borderLeft: '1px dashed #cbd5e1' }}>
                      <div style={{ height: '16px', borderBottom: '1px dotted #94a3b8' }}></div>
                    </td>
                  </tr>
                ))}

                {/* Additional 3 blank rows for physical pen signoffs */}
                {[1, 2, 3].map((blankIdx) => (
                  <tr key={`blank-${blankIdx}`} style={{ borderBottom: '1px solid #e2e8f0', height: '28px' }}>
                    <td style={{ padding: '0.35rem 0.5rem' }}></td>
                    <td style={{ padding: '0.35rem 0.5rem' }}></td>
                    <td style={{ padding: '0.35rem 0.5rem' }}></td>
                    <td style={{ padding: '0.35rem 0.5rem' }}></td>
                    <td style={{ padding: '0.35rem 0.5rem' }}></td>
                    <td style={{ padding: '0.35rem 0.5rem', borderLeft: '1px dashed #cbd5e1' }}>
                      <div style={{ height: '16px', borderBottom: '1px dotted #94a3b8' }}></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Warning & Legal Note */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.65rem',
            color: '#64748b',
            paddingTop: '0.5rem',
            borderTop: '1px solid #cbd5e1'
          }}>
            <span>
              NOTICE: This routing slip must remain attached to the official folder at all times until final archival.
            </span>
            <span>
              DocTrack LGU • Local Network Document Routing System
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
