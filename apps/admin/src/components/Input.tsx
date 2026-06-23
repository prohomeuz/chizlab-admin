import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const inputBase =
  'w-full bg-bg-elevated border border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted transition-colors duration-[200ms] focus:outline-none focus:border-2 focus:border-focus focus:shadow-[0_0_0_3px_rgba(184,146,106,0.15)] disabled:bg-bg-sunken disabled:opacity-60';

const errorClass = 'border-2 border-[#9b2c2c]';

export function Input({ label, error, helperText, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`${inputBase} ${error ? errorClass : ''} ${className}`}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-[#9b2c2c]" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="text-xs text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, id, className = '', ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`${inputBase} resize-y min-h-[120px] ${error ? errorClass : ''} ${className}`}
        aria-describedby={error ? `${inputId}-error` : undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-[#9b2c2c]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
