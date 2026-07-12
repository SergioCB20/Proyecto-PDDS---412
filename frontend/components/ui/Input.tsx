'use client';

import { useId } from 'react';

export function Input({ label, error, className = '', id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`flex flex-col gap-1 ${className}`} suppressHydrationWarning>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`px-3 py-2 rounded-lg border text-sm transition-colors
          bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600
          text-slate-900 dark:text-slate-100
          placeholder:text-slate-600 dark:placeholder:text-slate-600
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        autoComplete="off"
        suppressHydrationWarning
        {...props}
      />
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}