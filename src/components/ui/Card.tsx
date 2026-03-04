'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'feature' | 'premium' | 'interactive';
  className?: string;
  onClick?: () => void;
}

export function Card({ children, variant = 'default', className = '', onClick }: CardProps) {
  const variantClasses = {
    default: 'bg-dark-800 rounded-2xl border border-dark-600 shadow-card-dark',
    feature: 'bg-dark-800/80 rounded-2xl border border-dark-600 backdrop-blur-sm',
    premium: 'bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-yellow-500/30 shadow-glow-premium',
    interactive: 'bg-dark-800 rounded-2xl border border-dark-600 shadow-card-dark cursor-pointer hover:border-accent/50 hover:shadow-glow-accent transition-all duration-200',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={`p-6 ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}
