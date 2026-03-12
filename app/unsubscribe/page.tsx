'use client';

import { useState } from 'react';

export default function UnsubscribePage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleUnsubscribe = async () => {
    setStatus('loading');
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link.');
      return;
    }

    try {
      const decoded = atob(token);
      const colonIdx = decoded.indexOf(':');
      if (colonIdx === -1) throw new Error('Invalid token');

      const agencyId = decoded.slice(0, colonIdx);
      const email = decoded.slice(colonIdx + 1);

      const res = await fetch('/api/webhooks/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agency_id: agencyId, email }),
      });

      if (res.ok) {
        setStatus('done');
        setMessage('You have been successfully unsubscribed.');
      } else {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Invalid unsubscribe link.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '48px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>
          ✉️
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
          Unsubscribe
        </h1>

        {status === 'idle' && (
          <>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px' }}>
              Click the button below to unsubscribe from future marketing emails.
            </p>
            <button
              onClick={handleUnsubscribe}
              style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
            >
              Unsubscribe
            </button>
          </>
        )}

        {status === 'loading' && (
          <p style={{ color: '#6b7280', fontSize: '15px' }}>Processing...</p>
        )}

        {status === 'done' && (
          <div>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>
              ✓
            </div>
            <p style={{ color: '#059669', fontSize: '15px', fontWeight: 600 }}>{message}</p>
            <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '12px' }}>
              You will no longer receive marketing emails from us.
            </p>
          </div>
        )}

        {status === 'error' && (
          <p style={{ color: '#dc2626', fontSize: '15px' }}>{message}</p>
        )}

        <p style={{ color: '#d1d5db', fontSize: '12px', marginTop: '32px' }}>
          Powered by Kyra
        </p>
      </div>
    </div>
  );
}
