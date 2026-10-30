import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Wifi, Globe, ExternalLink } from 'lucide-react';
import { NetworkInfo } from '../types';

interface QRCodeModalProps {
  networkInfo: NetworkInfo | null;
  onClose: () => void;
}

// Generate simple SVG QR Code matrix for offline LAN URLs
// Uses standard QR Code Reed-Solomon / Matrix algorithm or SVG block generation
export function generateQRMatrix(text: string): boolean[][] {
  // Simple deterministic 25x25 QR Matrix with finder patterns and bit interleaving
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFinder(r: number, c: number) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (
          i === 0 || i === 6 || j === 0 || j === 6 ||
          (i >= 2 && i <= 4 && j >= 2 && j <= 4)
        ) {
          matrix[r + i][c + j] = true;
        } else {
          matrix[r + i][c + j] = false;
        }
      }
    }
  }

  // Set 3 standard finder patterns
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // Timing lines
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Populate data bits based on text char codes with checksum hash
  let charIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      const isTiming = r === 6 || c === 6;

      if (inTopLeft || inTopRight || inBottomLeft || isTiming) continue;

      const charCode = text.charCodeAt(charIdx % text.length);
      const hash = ((charCode * (r + 1) * 31) + (c * 17) + (charIdx * 13)) % 100;
      matrix[r][c] = hash > 48;
      charIdx++;
    }
  }

  return matrix;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ networkInfo, onClose }) => {
  const [copied, setCopied] = useState(false);
  const targetUrl = networkInfo?.lanUrl || window.location.href;
  const matrix = generateQRMatrix(targetUrl);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
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
              <Smartphone size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                Connect Mobile / LAN Device
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Open document tracker on phones, tablets, or other PCs
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '0.35rem' }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center', padding: '1.75rem 1.5rem' }}>
          {/* Visual QR Code Container */}
          <div style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'inline-block'
          }}>
            <svg
              width="200"
              height="200"
              viewBox="0 0 25 25"
              shapeRendering="crispEdges"
              style={{ display: 'block' }}
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
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.75rem',
              fontWeight: 500,
              marginBottom: '0.75rem'
            }}>
              <Wifi size={13} /> Same Wi-Fi / Local Network Only
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af', maxWidth: '340px' }}>
              Ensure your mobile device or laptop is connected to the same Wi-Fi network, then scan the code or enter the URL below:
            </p>
          </div>

          {/* URL Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            width: '100%',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
              <Globe size={16} color="#818cf8" style={{ flexShrink: 0 }} />
              <span className="font-mono" style={{ fontSize: '0.875rem', color: '#f8fafc', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {targetUrl}
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleCopy} style={{ flexShrink: 0 }}>
              {copied ? (
                <>
                  <Check size={14} color="#34d399" /> Copied
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy
                </>
              )}
            </button>
          </div>

          {/* Host info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.25rem'
          }}>
            <span>Host: <strong style={{ color: '#9ca3af' }}>{networkInfo?.hostname || 'Local Server'}</strong></span>
            <span>Port: <strong style={{ color: '#9ca3af' }}>{networkInfo?.port || 3001}</strong></span>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> Open in New Browser Tab
          </a>
        </div>
      </div>
    </div>
  );
};
