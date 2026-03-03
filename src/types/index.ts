export interface User {
  id: string;
  email: string;
  onboarded: boolean;
  subscriptionStatus: 'trialing' | 'active' | 'canceled';
  trialEndsAt?: Date;
}

export interface Dog {
  id: string;
  userId: string;
  name: string;
  breed?: string;
  birthDate?: Date;
  adoptedAt?: Date;
  hasVisitedVet?: boolean;
  mainConcern?: string;
}

export interface VaccineSchedule {
  id: string;
  dogId: string;
  type: 'mixed_vaccine' | 'rabies';
  scheduledDate: Date;
  notifiedWeek: boolean;
  notifiedDay: boolean;
  completed: boolean;
}

export interface HearingMessage {
  role: 'assistant' | 'user';
  content: string;
}

export interface InsuranceRecommendation {
  name: string;
  company: string;
  monthlyPrice: number;
  coveragePercent: number;
  features: string[];
  reason: string;
}
