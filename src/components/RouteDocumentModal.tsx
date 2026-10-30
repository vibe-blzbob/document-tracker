import React, { useState } from 'react';
import { X, Send, AlertCircle, Building, CheckSquare, KeyRound } from 'lucide-react';
import { DocumentRecord, User, MUNICIPAL_OFFICES, ACTION_REQUIRED_OPTIONS } from '../types';
import { api } from '../api';

interface RouteDocumentModalProps {
  document: DocumentRecord;
  currentUser: User | null;
  offices?: string[];
  actions?: string[];
  onSuccess: (updatedDoc: DocumentRecord) => void;
  onClose: () => void;
}

export const RouteDocumentModal: React.FC<RouteDocumentModalProps> = ({
  document,
  currentUser,
  offices,
  actions,
  onSuccess,
  onClose
}) => {
  const officeList = offices && offices.length > 0 ? offices : MUNICIPAL_OFFICES;
  const actionList = actions && actions.length > 0 ? actions : ACTION_REQUIRED_OPTIONS;

  const [toOffice, setToOffice] = useState<string>(
    officeList.find((o) => o !== document.current_office) || officeList[0]
  );
  const [customOffice, setCustomOffice] = useState('');
  const [actionRequired, setActionRequired] = useState<string>(
    document.action_required || actionList[0]
  );
  const [notes, setNotes] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalToOffice = toOffice === 'OTHER' ? customOffice.trim() : toOffice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalToOffice) {
      setError('Please select or specify the receiving municipal office.');
      return;
    }
    if (!actionRequired) {
      setError('Please specify the required action.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await api.routeDocument(document.id, {
        to_office: finalToOffice,
        action_required: actionRequired,
        author_name: currentUser ? `${currentUser.name} (${currentUser.department})` : 'Authorized Staff',
        notes: notes.trim() || undefined,
        user_id: currentUser?.id,
        pin: pin.trim() || undefined
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to route document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="card modal-content" style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={18} color="#818cf8" /> Forward / Route Document
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.2rem' }}>
              Transfer document custody to another municipal department with transmittal instructions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Current Status Box */}
        <div style={{
          marginTop: '1rem',
          padding: '0.875rem',
          background: 'rgba(30, 41, 59, 0.7)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          fontSize: '0.8125rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af' }}>Tracking Code:</span>
            <span className="font-mono" style={{ color: '#818cf8', fontWeight: 600 }}>{document.tracking_code}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af' }}>Current Custody:</span>
            <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{document.current_office}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af' }}>Originating Office:</span>
            <span style={{ color: '#f1f5f9' }}>{document.originating_office}</span>
          </div>
        </div>

        {error && (
          <div style={{
            margin: '1rem 0 0',
            padding: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            color: '#f87171',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Routing Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Target Office */}
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building size={14} color="#818cf8" /> Route / Forward To (Receiving Office) *
            </label>
            <select
              className="select"
              value={toOffice}
              onChange={(e) => setToOffice(e.target.value)}
              required
            >
              {officeList.map((office) => (
                <option key={office} value={office} disabled={office === document.current_office}>
                  {office} {office === document.current_office ? '(Current Custodian)' : ''}
                </option>
              ))}
              <option value="OTHER">+ Other External / Attached Agency...</option>
            </select>
          </div>

          {toOffice === 'OTHER' && (
            <div>
              <label className="label">Specify External Agency / Office Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. DILG Field Office, Provincial Capitol, etc."
                value={customOffice}
                onChange={(e) => setCustomOffice(e.target.value)}
                required
              />
            </div>
          )}

          {/* Action Required */}
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckSquare size={14} color="#818cf8" /> Action Required by Receiving Office *
            </label>
            <select
              className="select"
              value={actionRequired}
              onChange={(e) => setActionRequired(e.target.value)}
              required
            >
              {actionList.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* Transmittal Notes */}
          <div>
            <label className="label">Transmittal Endorsement / Notes (Optional)</label>
            <textarea
              className="textarea"
              rows={2}
              placeholder="e.g. Please expedite review. Attached complete attachments and zoning clearances."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* PIN Confirmation */}
          {currentUser && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px'
            }}>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <KeyRound size={13} color="#9ca3af" /> Sign Off with 4-Digit PIN ({currentUser.name})
              </label>
              <input
                type="password"
                maxLength={4}
                className="input font-mono"
                placeholder="Enter your 4-digit PIN to sign transmittal"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                style={{ maxWidth: '220px', letterSpacing: '0.3em' }}
              />
              <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem', display: 'block' }}>
                Optional: Confirms sender identity in the audit trail.
              </span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Send size={15} />
              {loading ? 'Routing Document...' : 'Forward Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
