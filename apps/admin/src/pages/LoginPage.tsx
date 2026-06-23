import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const PIN_LENGTH = 8;

export function LoginPage() {
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login } = useAuth();
  const navigate = useNavigate();

  const pin = digits.join('');
  const pinComplete = pin.length === PIN_LENGTH && digits.every((d) => d !== '');
  const isLocked = lockoutUntil !== null && lockoutUntil > new Date();

  const focusBox = useCallback((idx: number) => {
    inputRefs.current[idx]?.focus();
  }, []);

  const handleDigitChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const updated = [...digits];
    updated[idx] = val;
    setDigits(updated);
    if (val && idx < PIN_LENGTH - 1) {
      focusBox(idx + 1);
    }
    setError('');
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const updated = [...digits];
        updated[idx] = '';
        setDigits(updated);
      } else if (idx > 0) {
        const updated = [...digits];
        updated[idx - 1] = '';
        setDigits(updated);
        focusBox(idx - 1);
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focusBox(idx - 1);
    } else if (e.key === 'ArrowRight' && idx < PIN_LENGTH - 1) {
      focusBox(idx + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    const updated = Array(PIN_LENGTH).fill('');
    for (let i = 0; i < text.length; i++) updated[i] = text[i] ?? '';
    setDigits(updated);
    focusBox(Math.min(text.length, PIN_LENGTH - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinComplete || isLocked || loading) return;
    setLoading(true);
    setError('');
    try {
      await login(pin);
      navigate('/materials', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 429) {
          // Lockout for 15 minutes
          const until = new Date(Date.now() + 15 * 60 * 1000);
          setLockoutUntil(until);
          setError("Urinishlar tugadi. 15 daqiqa kuting.");
        } else {
          setError("Noto'g'ri PIN. Qayta urinib ko'ring.");
        }
      } else {
        setError("Xatolik yuz berdi. Qayta urinib ko'ring.");
      }
      setDigits(Array(PIN_LENGTH).fill(''));
      focusBox(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-primary overflow-hidden"
      style={{ backgroundColor: '#003837' }}
    >
      {/* Naqsh background */}
      <img
        src="/brand/naqsh-about.svg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 m-auto w-full max-w-2xl pointer-events-none select-none"
        style={{ opacity: 0.17, zIndex: 0 }}
      />

      {/* Login card */}
      <div
        className="relative z-10 flex flex-col items-center gap-8 px-8 py-10 rounded-xl w-full max-w-[420px] mx-4"
        style={{
          background: 'rgba(255,255,246,0.04)',
          border: '1px solid rgba(255,255,246,0.10)',
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo */}
        <img src="/brand/logo-white.svg" alt="Chizlab" width={120} />

        {/* Heading */}
        <h1
          className="text-2xl font-bold text-center"
          style={{ color: '#fffff6', fontFamily: "'PPEditorialNew', Georgia, serif" }}
        >
          Tizimga kirish
        </h1>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col items-center gap-6 w-full">
          {/* PIN boxes */}
          <div className="flex gap-2" role="group" aria-label="8 xonali PIN kodi">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                autoFocus={idx === 0}
                disabled={isLocked || loading}
                aria-label={`${idx + 1}-raqam`}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className="w-11 h-14 text-center text-2xl font-bold rounded-md transition-all duration-[150ms] focus:outline-none disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,246,0.10)',
                  border: `1px solid rgba(255,255,246,0.20)`,
                  color: '#fffff6',
                  fontFamily: "'SFProDisplay', system-ui, sans-serif",
                  letterSpacing: '0.1em',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.border = '2px solid #b8926a')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = '1px solid rgba(255,255,246,0.20)')
                }
              />
            ))}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!pinComplete || isLocked || loading}
            className="w-full py-[11px] rounded-md text-base font-medium text-white transition-colors duration-[150ms]"
            style={{
              background: '#b8926a',
              opacity: !pinComplete || isLocked || loading ? 0.5 : 1,
              pointerEvents: !pinComplete || isLocked || loading ? 'none' : 'auto',
            }}
            onMouseEnter={(e) => { if (pinComplete && !isLocked) (e.currentTarget.style.background = '#9a7555'); }}
            onMouseLeave={(e) => { (e.currentTarget.style.background = '#b8926a'); }}
          >
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>

          {/* Error */}
          {error && (
            <p className="text-sm text-center" style={{ color: 'rgba(255,100,100,0.9)' }} role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
