'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'feature' | 'premium' | 'interactive' | 'cute' | 'warm';
  className?: string;
  onClick?: () => void;
}

export function Card({ children, variant = 'default', className = '', onClick }: CardProps) {
  const variantClasses = {
    default: 'bg-white rounded-3xl border border-cream-200 shadow-card',
    feature: 'bg-white/90 rounded-3xl border border-cream-200 backdrop-blur-sm shadow-card',
    premium: 'bg-gradient-to-br from-cream-50 to-white rounded-3xl border-2 border-yellow-200 shadow-soft',
    interactive: 'bg-white rounded-3xl border border-cream-200 shadow-card cursor-pointer hover:border-accent-light hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300',
    cute: 'bg-gradient-to-br from-white to-cream-50 rounded-3xl border-2 border-cream-200 shadow-card hover:border-accent-light hover:shadow-card-hover transition-all duration-300',
    warm: 'bg-gradient-to-br from-cream-50 to-peach-50 rounded-3xl border border-cream-200 shadow-card',
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
