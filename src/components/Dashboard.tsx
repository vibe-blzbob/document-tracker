import React, { useEffect, useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  Activity,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Building
} from 'lucide-react';
import { SummaryMetrics } from '../types';
import { api } from '../api';

interface DashboardProps {
  onSelectDocument: (docId: string) => void;
  onOpenCreateModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectDocument,
  onOpenCreateModal
}) => {
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#9ca3af' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  // Calculate stats
  const total = metrics.totalDocs;
  const urgentCount = metrics.priorityBreakdown.find((p) => p.priority === 'Urgent')?.count ?? 0;
  const highCount = metrics.priorityBreakdown.find((p) => p.priority === 'High')?.count ?? 0;
  const urgentOrHigh = urgentCount + highCount;

  const completedCount = metrics.stageBreakdown
    .filter((s) => /approved|completed|paid|executed|archived/i.test(s.current_stage))
    .reduce((sum, s) => sum + s.count, 0);

  const inProgressCount = Math.max(0, total - completedCount);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 4 Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Card 1: Total Docs */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#818cf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
              Total Tracked
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
              {total}
            </div>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
              In Active Workflow
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60a5fa' }}>
              {inProgressCount}
            </div>
          </div>
        </div>

        {/* Card 3: Urgent / High Priority */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
              High / Urgent Attention
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171' }}>
              {urgentOrHigh}
            </div>
          </div>
        </div>

        {/* Card 4: Completed / Archived */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
              Completed & Ratified
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>
              {completedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Stages Breakdown & Recent Audit Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Stages Breakdown */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#818cf8" /> Lifecycle Distribution
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{metrics.stageBreakdown.length} Active Stages</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {metrics.stageBreakdown.map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.current_stage} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>{item.current_stage}</span>
                    <span style={{ color: '#9ca3af' }}>
                      <strong style={{ color: '#818cf8' }}>{item.count}</strong> ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick CTA */}
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button className="btn btn-secondary btn-sm" onClick={onOpenCreateModal} style={{ width: '100%' }}>
              Track Another Document
            </button>
          </div>
        </div>

        {/* Municipal Office Holding Queues */}
        {metrics.officeBreakdown && metrics.officeBreakdown.length > 0 && (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={18} color="#60a5fa" /> Department Holding Queues
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{metrics.officeBreakdown.length} Departments</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {metrics.officeBreakdown.map((item) => {
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.current_office} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: '#f8fafc', fontWeight: 500 }}>{item.current_office}</span>
                      <span style={{ color: '#9ca3af' }}>
                        <strong style={{ color: '#60a5fa' }}>{item.count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Recent Activity Stream */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#34d399" /> Recent Audit Activity
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Live LAN Stream</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto' }}>
            {metrics.recentHistory.map((h) => (
              <div
                key={h.id}
                onClick={() => onSelectDocument(h.document_id)}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease'
                }}
                className="table-row-hover"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                      {h.tracking_code}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 500 }}>
                      {h.action === 'created' ? 'Initiated' : h.to_stage ? `Moved to ${h.to_stage}` : 'Edited'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.3 }}>
                    {h.document_title}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    by {h.author_name}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                    {formatDate(h.created_at)}
                  </span>
                  <ArrowRight size={14} color="#6b7280" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
