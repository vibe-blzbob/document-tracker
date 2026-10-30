import React, { useState } from 'react';
import { Wifi, WifiOff, QrCode, User, Shield, Eye, EyeOff } from 'lucide-react';
import { NetworkInfo, User as UserType } from '../types';

interface NetworkBannerProps {
  networkInfo: NetworkInfo | null;
  currentUser: UserType | null;
  onOpenQR: () => void;
  onOpenAuth: () => void;
  onSignOut?: () => void;
}

export const NetworkBanner: React.FC<NetworkBannerProps> = ({
  networkInfo,
  currentUser,
  onOpenQR,
  onOpenAuth,
  onSignOut
}) => {
  const [showUrl, setShowUrl] = useState(false);
  const isLocalOnly = networkInfo?.isLocalOnly || !networkInfo?.lanUrl;
  const lanUrl = networkInfo?.lanUrl || 'http://localhost:3001';

  return (
    <div className="network-banner">
      {/* LAN Server IP status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          color: isLocalOnly ? '#9ca3af' : '#34d399',
          fontWeight: 600
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isLocalOnly ? '#6b7280' : '#10b981',
            boxShadow: isLocalOnly ? 'none' : '0 0 8px #10b981',
            display: 'inline-block'
          }} />
          {isLocalOnly ? <WifiOff size={13} /> : <Wifi size={13} />} {isLocalOnly ? 'Local Only:' : 'LAN Active:'}
        </div>

        {isLocalOnly ? (
          <span className="font-mono" style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
            Bound to 127.0.0.1 (Network hidden)
          </span>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="font-mono" style={{ color: '#d1d5db', letterSpacing: showUrl ? 'normal' : '0.12em' }}>
                {showUrl ? lanUrl : '••••••••••••••••'}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowUrl(!showUrl)}
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                title={showUrl ? 'Hide LAN URL' : 'Show LAN URL'}
              >
                {showUrl ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenQR}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              title="Connect mobile device via QR Code"
            >
              <QrCode size={13} /> Connect Phone / Device
            </button>
          </>
        )}
      </div>

      {/* Staff Account Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f8fafc' }}>
              <User size={13} color="#818cf8" />
              <strong>{currentUser.name}</strong>
              <span style={{ color: '#9ca3af' }}>({currentUser.role})</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenAuth}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
            >
              Switch Staff
            </button>
            {onSignOut && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onSignOut}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#f87171' }}
                title="Sign out of staff account"
              >
                Sign Out
              </button>
            )}
          </div>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenAuth}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
          >
            <Shield size={13} /> Staff Sign-In
          </button>
        )}
      </div>
    </div>
  );
};
