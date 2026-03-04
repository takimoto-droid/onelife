'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dark-100 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-dark-600 focus:border-accent focus:ring-accent/20'
          } text-dark-100 placeholder-dark-400 outline-none transition-all duration-200 focus:ring-2 ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1 text-xs text-dark-400">{hint}</p>
        )}
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
