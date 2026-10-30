import React, { useState } from 'react';
import { X, ArrowRight, ShieldCheck, AlertCircle, FileCheck } from 'lucide-react';
import { User, DocumentRecord } from '../types';
import { api } from '../api';

interface AdvanceStageModalProps {
  document: DocumentRecord;
  stages: string[];
  currentUser: User | null;
  onSuccess: (updated: DocumentRecord) => void;
  onClose: () => void;
}

export const AdvanceStageModal: React.FC<AdvanceStageModalProps> = ({
  document,
  stages,
  currentUser,
  onSuccess,
  onClose
}) => {
  const currentIndex = stages.indexOf(document.current_stage);
  const defaultNext = currentIndex !== -1 && currentIndex < stages.length - 1
    ? stages[currentIndex + 1]
    : stages[0];

  const [targetStage, setTargetStage] = useState<string>(defaultNext);
  const [notes, setNotes] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStage) {
      setError('Please select a target stage');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await api.advanceStage(document.id, {
        target_stage: targetStage,
        author_name: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Authorized Staff',
        notes: notes.trim() || undefined,
        user_id: currentUser?.id,
        pin: pin || undefined
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to advance stage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
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
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                Advance Document Lifecycle
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Sign off on stage transition & record immutable audit entry
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '0.35rem' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
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

            {/* Document preview header */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: '10px',
              padding: '0.75rem 1rem'
            }}>
              <div className="font-mono" style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                {document.tracking_code}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.2rem' }}>
                {document.title}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginTop: '0.6rem',
                fontSize: '0.8125rem'
              }}>
                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                  {document.current_stage}
                </span>
                <ArrowRight size={14} color="#9ca3af" />
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  {targetStage}
                </span>
              </div>
            </div>

            {/* Target Stage Selector */}
            <div className="form-group">
              <label className="form-label required">Select New Target Stage</label>
              <select
                className="select"
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value)}
                required
              >
                {stages.map((stg) => (
                  <option key={stg} value={stg} disabled={stg === document.current_stage}>
                    {stg} {stg === document.current_stage ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sign-off Notes */}
            <div className="form-group">
              <label className="form-label">Sign-Off Notes / Transition Rationale</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="e.g. Compliance checks passed; verified invoice figures against contract ledger."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Signer identity & PIN */}
            <div style={{
              background: 'rgba(17, 24, 39, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Signing Officer:</span>
                <strong style={{ fontSize: '0.8125rem', color: '#f8fafc' }}>
                  {currentUser ? `${currentUser.name} (${currentUser.department})` : 'Authorized Staff'}
                </strong>
              </div>

              {currentUser && (
                <div className="form-group">
                  <label className="form-label">Confirm with 4-Digit Security PIN (Optional)</label>
                  <input
                    type="password"
                    maxLength={4}
                    className="input font-mono"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Leave blank to sign off with current session credentials.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <FileCheck size={16} />
              <span>{loading ? 'Recording Sign-off...' : `Confirm & Move to ${targetStage}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
