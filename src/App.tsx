import React, { useState, useEffect } from 'react';
import {
  FileText,
  LayoutDashboard,
  Sliders,
  Plus,
  Layers,
  Settings,
  Users
} from 'lucide-react';
import {
  DocumentRecord,
  Template,
  User,
  NetworkInfo,
  MUNICIPAL_OFFICES,
  ACTION_REQUIRED_OPTIONS
} from './types';
import { api } from './api';
import { NetworkBanner } from './components/NetworkBanner';
import { DocumentList } from './components/DocumentList';
import { DocumentDetail } from './components/DocumentDetail';
import { DocumentFormModal } from './components/DocumentFormModal';
import { TemplateManager } from './components/TemplateManager';
import { Dashboard } from './components/Dashboard';
import { QRCodeModal } from './components/QRCodeModal';
import { AuthModal } from './components/AuthModal';
import { DropdownManager } from './components/DropdownManager';
import { UserManager } from './components/UserManager';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'dashboard' | 'templates' | 'dropdowns' | 'users'>('documents');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [offices, setOffices] = useState<string[]>([...MUNICIPAL_OFFICES]);
  const [actions, setActions] = useState<string[]>([...ACTION_REQUIRED_OPTIONS]);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      const [net, tpls, docs, userList, officeData] = await Promise.all([
        api.getNetworkInfo(),
        api.listTemplates(),
        api.listDocuments(),
        api.listUsers(),
        api.getOffices().catch(() => ({ offices: [...MUNICIPAL_OFFICES], actions: [...ACTION_REQUIRED_OPTIONS] }))
      ]);

      setNetworkInfo(net);
      setTemplates(tpls);
      setDocuments(docs);
      setUsers(userList);
      if (officeData?.offices?.length) setOffices(officeData.offices);
      if (officeData?.actions?.length) setActions(officeData.actions);

      // Standalone login required: do not auto-login on startup
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('lan_tracker_user_id');
  };

  const refreshDropdowns = async () => {
    try {
      const data = await api.getOffices();
      if (data.offices?.length) setOffices(data.offices);
      if (data.actions?.length) setActions(data.actions);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserSelected = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('lan_tracker_user_id', user.id);
  };

  const handleDocumentCreated = (newDoc: DocumentRecord) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocId(newDoc.id);
  };

  const handleDocumentUpdated = (updated: DocumentRecord) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!currentUser) return;
    try {
      await api.deleteDocument(docId, currentUser.id);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocId === docId) setSelectedDocId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const refreshDocuments = async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        background: 'var(--bg-main)',
        fontSize: '0.9rem'
      }}>
        Connecting to Local Document Database...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthModal
        isStandalone={true}
        currentUser={null}
        onSelectUser={handleUserSelected}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Network & Staff Status Bar */}
      <NetworkBanner
        networkInfo={networkInfo}
        currentUser={currentUser}
        onOpenQR={() => setShowQRModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Glassmorphism Header */}
      <header className="glass-header" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
        <div className="main-header-container">
          {/* Logo & Brand */}
          <div
            className="header-brand"
            onClick={() => {
              setSelectedDocId(null);
              setActiveTab('documents');
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)'
            }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                DocTrack <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700 }}>LGU</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Document Tracking & Routing Information System
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="main-nav-tabs">
            <button
              onClick={() => {
                setSelectedDocId(null);
                setActiveTab('documents');
                refreshDocuments();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'documents' && !selectedDocId ? 'var(--bg-surface-elevated)' : 'transparent',
                color: activeTab === 'documents' && !selectedDocId ? '#f8fafc' : '#9ca3af',
                fontWeight: activeTab === 'documents' && !selectedDocId ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <FileText size={16} color={activeTab === 'documents' && !selectedDocId ? '#818cf8' : '#9ca3af'} />
              <span>Registry</span>
              <span className="badge" style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem'
              }}>
                {documents.length}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedDocId(null);
                setActiveTab('dashboard');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'dashboard' && !selectedDocId ? 'var(--bg-surface-elevated)' : 'transparent',
                color: activeTab === 'dashboard' && !selectedDocId ? '#f8fafc' : '#9ca3af',
                fontWeight: activeTab === 'dashboard' && !selectedDocId ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <LayoutDashboard size={16} color={activeTab === 'dashboard' && !selectedDocId ? '#818cf8' : '#9ca3af'} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setSelectedDocId(null);
                setActiveTab('templates');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'templates' && !selectedDocId ? 'var(--bg-surface-elevated)' : 'transparent',
                color: activeTab === 'templates' && !selectedDocId ? '#f8fafc' : '#9ca3af',
                fontWeight: activeTab === 'templates' && !selectedDocId ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Sliders size={16} color={activeTab === 'templates' && !selectedDocId ? '#818cf8' : '#9ca3af'} />
              <span>Document Types & Fields</span>
            </button>

            {/* Admin-only Dropdown Data Management Tab */}
            {currentUser?.role?.toLowerCase() === 'admin' && (
              <button
                onClick={() => {
                  setSelectedDocId(null);
                  setActiveTab('dropdowns');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'dropdowns' && !selectedDocId ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: activeTab === 'dropdowns' && !selectedDocId ? '#f8fafc' : '#9ca3af',
                  fontWeight: activeTab === 'dropdowns' && !selectedDocId ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Settings size={16} color={activeTab === 'dropdowns' && !selectedDocId ? '#818cf8' : '#9ca3af'} />
                <span>Dropdown Data</span>
                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.65rem' }}>
                  Admin
                </span>
              </button>
            )}

            {/* Admin-only Staff & User Accounts Tab */}
            {currentUser?.role?.toLowerCase() === 'admin' && (
              <button
                onClick={() => {
                  setSelectedDocId(null);
                  setActiveTab('users');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'users' && !selectedDocId ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: activeTab === 'users' && !selectedDocId ? '#f8fafc' : '#9ca3af',
                  fontWeight: activeTab === 'users' && !selectedDocId ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users size={16} color={activeTab === 'users' && !selectedDocId ? '#818cf8' : '#9ca3af'} />
                <span>Staff & Users</span>
                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.65rem' }}>
                  Admin
                </span>
              </button>
            )}
          </nav>

          {/* Primary Quick CTA */}
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Track Document
          </button>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="main-content-body">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: '#9ca3af' }}>
            Connecting to Local Network Document Database...
          </div>
        ) : selectedDocId ? (
          <DocumentDetail
            documentId={selectedDocId}
            templates={templates}
            users={users}
            currentUser={currentUser}
            lanUrl={networkInfo?.lanUrl ?? undefined}
            offices={offices}
            actions={actions}
            onBack={() => {
              setSelectedDocId(null);
              refreshDocuments();
            }}
            onDocumentUpdated={handleDocumentUpdated}
          />
        ) : activeTab === 'documents' ? (
          <DocumentList
            documents={documents}
            templates={templates}
            currentUser={currentUser}
            offices={offices}
            onSelectDocument={(id) => setSelectedDocId(id)}
            onOpenCreateModal={() => setShowCreateModal(true)}
            onDeleteDocument={handleDeleteDocument}
          />
        ) : activeTab === 'dashboard' ? (
          <Dashboard
            onSelectDocument={(id) => setSelectedDocId(id)}
            onOpenCreateModal={() => setShowCreateModal(true)}
          />
        ) : activeTab === 'templates' ? (
          <TemplateManager
            templates={templates}
            onTemplatesUpdated={(newTemplates) => setTemplates(newTemplates)}
          />
        ) : activeTab === 'dropdowns' ? (
          <DropdownManager
            currentUser={currentUser}
            templates={templates}
            onTemplatesUpdated={(newTemplates) => setTemplates(newTemplates)}
            onDropdownsUpdated={refreshDropdowns}
          />
        ) : (
          <UserManager
            currentUser={currentUser}
            users={users}
            offices={offices}
            onUsersUpdated={(updated) => setUsers(updated)}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.25rem 1.5rem',
        background: 'rgba(11, 15, 25, 0.8)',
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <strong>DocTrack Local Edition</strong> • Stored locally in <code className="font-mono" style={{ color: '#9ca3af' }}>tracker.db</code> with zero cloud dependencies.
          </div>
          <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
            Server Mode: <span style={{ color: networkInfo?.isLocalOnly ? '#9ca3af' : '#34d399', fontWeight: 500 }}>
              ● {networkInfo?.isLocalOnly ? 'Local Only (127.0.0.1)' : 'LAN Active'}
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showCreateModal && (
        <DocumentFormModal
          templates={templates}
          users={users}
          currentUser={currentUser}
          offices={offices}
          actions={actions}
          onSuccess={handleDocumentCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showQRModal && (
        <QRCodeModal
          networkInfo={networkInfo}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          currentUser={currentUser}
          onSelectUser={handleUserSelected}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
};
