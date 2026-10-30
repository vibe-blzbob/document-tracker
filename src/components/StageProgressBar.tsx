import React from 'react';
import { Check, ArrowRight, ShieldCheck } from 'lucide-react';

interface StageProgressBarProps {
  stages: string[];
  currentStage: string;
  onAdvanceClick?: () => void;
  canAdvance?: boolean;
}

export const StageProgressBar: React.FC<StageProgressBarProps> = ({
  stages,
  currentStage,
  onAdvanceClick,
  canAdvance = true
}) => {
  const currentIndex = stages.indexOf(currentStage);
  const isFinalStage = currentIndex === stages.length - 1;
  const nextStage = !isFinalStage && currentIndex !== -1 ? stages[currentIndex + 1] : null;

  return (
    <div style={{
      background: 'var(--bg-surface-elevated)',
      border: '1px solid var(--border-medium)',
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Lifecycle Progression
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span>Current Stage:</span>
            <span style={{ color: '#818cf8' }}>{currentStage}</span>
            {isFinalStage && (
              <span className="badge" style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.75rem'
              }}>
                <Check size={12} /> Lifecycle Complete
              </span>
            )}
          </div>
        </div>

        {canAdvance && onAdvanceClick && (
          <button
            onClick={onAdvanceClick}
            className={`btn ${isFinalStage ? 'btn-secondary' : 'btn-primary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ShieldCheck size={16} />
            <span>{isFinalStage ? 'Transition / Archive' : `Advance to ${nextStage || 'Next Stage'}`}</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>

      {/* Visual Stepper */}
      <div className="stepper-container" style={{ paddingBottom: '2.5rem' }}>
        {stages.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;

          return (
            <div key={stage} className="stepper-step">
              <div
                className={`step-node ${
                  isCompleted ? 'completed' : isActive ? 'active' : 'pending'
                }`}
                title={stage}
              >
                {isCompleted ? <Check size={18} strokeWidth={3} /> : idx + 1}
              </div>

              <div className={`step-label ${isActive ? 'active' : ''}`}>
                {stage}
              </div>

              {idx < stages.length - 1 && (
                <div
                  className={`stepper-line ${
                    idx < currentIndex ? 'completed' : ''
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
