'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'premium' | 'cute' | 'mint';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'font-bold rounded-full transition-all duration-300 flex items-center justify-center gap-2 active:scale-95';

  const sizeClasses = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6',
    lg: 'py-4 px-8 text-lg',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-accent to-accent-light text-white shadow-button hover:shadow-soft-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
    secondary: 'bg-white hover:bg-cream-50 text-brown-600 border-2 border-cream-300 hover:border-accent-light shadow-card',
    outline: 'border-2 border-accent text-accent hover:bg-accent hover:text-white',
    ghost: 'text-brown-500 hover:text-accent hover:bg-accent-50',
    premium: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-brown-800 shadow-soft hover:scale-105',
    cute: 'bg-gradient-to-r from-pink-300 to-peach-300 text-white shadow-soft hover:shadow-soft-lg hover:scale-105',
    mint: 'bg-gradient-to-r from-mint-400 to-mint-300 text-white shadow-soft hover:shadow-soft-lg hover:scale-105',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
