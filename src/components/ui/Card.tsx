'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'warm';
  className?: string;
}

export function Card({ children, variant = 'default', className = '' }: CardProps) {
  const variantClasses = {
    default: 'bg-white rounded-2xl shadow-sm border border-warm-200',
    warm: 'bg-warm-100 rounded-2xl',
  };

  return (
    <div className={`p-6 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
