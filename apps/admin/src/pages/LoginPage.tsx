import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const PIN_LENGTH = 8;

function BackspaceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="14" y2="15" />
      <line x1="14" y1="9" x2="18" y2="15" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

const KEY_BG     = '#f5f5e8';
const KEY_HOVER  = 'rgba(0,56,55,0.09)';
const KEY_ACTIVE = 'rgba(0,56,55,0.16)';

function KeypadButton({
  children, onClick, disabled, label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        height: 60,
        background: KEY_BG,
        border: 'none',
        borderRadius: 10,
        fontSize: 20,
        fontWeight: 500,
        color: disabled ? 'rgba(19,19,19,0.25)' : '#131313',
        fontFamily: "'SFProDisplay', system-ui, sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.1s ease, transform 0.08s ease',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = KEY_HOVER; }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = KEY_BG;
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
      onMouseDown={e => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.91)';
          (e.currentTarget as HTMLButtonElement).style.background = KEY_ACTIVE;
        }
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = KEY_HOVER;
      }}
    >
      {children}
    </button>
  );
}

export function LoginPage() {
  const [digits, setDigits]         = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError]           = useState('');
  const [errorType, setErrorType]   = useState<'error' | 'lockout'>('error');
  const [loading, setLoading]       = useState(false);
  const [shakeKey, setShakeKey]     = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const filledCount = digits.filter(d => d !== '').length;
  const isLocked    = lockoutUntil !== null && lockoutUntil > new Date();
  const submittingRef = useRef(false);

  // --- Auto-submit when all 8 digits filled ---
  useEffect(() => {
    if (filledCount !== PIN_LENGTH || isLocked || submittingRef.current) return;
    submittingRef.current = true;
    const pin = digits.join('');
    setLoading(true);
    setError('');
    login(pin)
      .then(() => {
        navigate('/materials', { replace: true });
      })
      .catch((err: unknown) => {
        submittingRef.current = false;
        setLoading(false);
        setDigits(Array(PIN_LENGTH).fill(''));
        setShakeKey(k => k + 1);
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 429) {
            setLockoutUntil(new Date(Date.now() + 15 * 60 * 1000));
            setErrorType('lockout');
            setError("Juda ko'p urinish. 15 daqiqa kuting.");
          } else {
            setErrorType('error');
            setError("Noto'g'ri PIN. Qayta urinib ko'ring.");
          }
        } else {
          setErrorType('error');
          setError("Ulanishda xatolik. Qayta urinib ko'ring.");
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filledCount]);

  // --- Add digit ---
  const addDigit = useCallback((d: string) => {
    if (isLocked || loading) return;
    setDigits(prev => {
      const idx = prev.findIndex(v => v === '');
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = d;
      return next;
    });
  }, [isLocked, loading]);

  // --- Remove last digit ---
  const removeDigit = useCallback(() => {
    if (isLocked || loading) return;
    setDigits(prev => {
      const lastIdx = prev.map((v, i) => (v !== '' ? i : -1)).filter(i => i !== -1).pop();
      if (lastIdx === undefined) return prev;
      const next = [...prev];
      next[lastIdx] = '';
      return next;
    });
  }, [isLocked, loading]);

  // --- Keyboard support ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) addDigit(e.key);
      else if (e.key === 'Backspace') removeDigit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addDigit, removeDigit]);

  // --- Paste support: paste a copied 8-digit PIN (fills all slots → auto-submits) ---
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isLocked || loading) return;
      const text = e.clipboardData?.getData('text') ?? '';
      const nums = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
      if (!nums) return;
      e.preventDefault();
      const next = Array(PIN_LENGTH).fill('');
      for (let i = 0; i < nums.length; i++) next[i] = nums[i]!;
      setDigits(next);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isLocked, loading]);

  const keypadDisabled = isLocked || loading;

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#fffff6' }}>

      {/* Left panel — full image (70%) */}
      <div
        className="hidden md:flex items-center justify-center"
        style={{ width: '70%', flexShrink: 0, background: '#fffff6' }}
      >
        <img
          src="/brand/chizlab-pen.png"
          alt=""
          aria-hidden="true"
          style={{ width: '75%', height: '75%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
        />
      </div>

      {/* Right panel — login form (30% desktop, 100% mobile) */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{ background: '#fffff6', padding: '40px 32px' }}
      >
        <div style={{
          width: '100%', maxWidth: 280,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 28,
        }}>

          {/* Logo */}
          <img src="/brand/logo.svg" alt="Chizlab" style={{ width: 180, height: 'auto', display: 'block' }} />

          {/* PIN dots — key forces animation replay on each shake */}
          <div
            key={shakeKey}
            className={shakeKey > 0 ? 'pin-shake' : ''}
            role="group"
            aria-label="PIN kodi"
            aria-live="polite"
            style={{ display: 'flex', gap: 10, alignItems: 'center' }}
          >
            {digits.map((d, i) => (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  width: 13, height: 13, borderRadius: '50%',
                  border: `2px solid ${d ? '#003837' : error ? '#9b2c2c' : 'rgba(19,19,19,0.22)'}`,
                  background: d ? '#003837' : 'transparent',
                  transition: 'background 0.12s ease, border-color 0.15s ease',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Loading text */}
          {loading && (
            <p style={{
              margin: '-12px 0', fontSize: 12,
              color: 'rgba(19,19,19,0.45)', fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.02em',
            }}>
              Tekshirilmoqda...
            </p>
          )}

          {/* Error message — stays until next submit */}
          {error && !loading && (
            <div
              role="alert"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 14px', borderRadius: 8,
                background: errorType === 'lockout' ? '#fef3e2' : '#fff5f5',
                border: `1px solid ${errorType === 'lockout' ? 'rgba(146,85,10,0.2)' : 'rgba(155,44,44,0.18)'}`,
                color: errorType === 'lockout' ? '#92550a' : '#9b2c2c',
                fontSize: 13, fontFamily: "'Inter', sans-serif",
                width: '100%', boxSizing: 'border-box' as const, lineHeight: 1.45,
              }}
            >
              {errorType === 'lockout' ? <LockIcon /> : <WarningIcon />}
              <span>{error}</span>
            </div>
          )}

          {/* Numeric keypad */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10, width: '100%',
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <KeypadButton
                key={n}
                onClick={() => addDigit(String(n))}
                disabled={keypadDisabled || filledCount === PIN_LENGTH}
                label={String(n)}
              >
                {n}
              </KeypadButton>
            ))}
            <div style={{ height: 60 }} />
            <KeypadButton
              onClick={() => addDigit('0')}
              disabled={keypadDisabled || filledCount === PIN_LENGTH}
              label="0"
            >
              0
            </KeypadButton>
            <KeypadButton
              onClick={removeDigit}
              disabled={keypadDisabled || filledCount === 0}
              label="O'chirish"
            >
              <BackspaceIcon />
            </KeypadButton>
          </div>

        </div>
      </div>
    </div>
  );
}
