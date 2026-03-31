// localStorage ベースのデータストア

export interface Dog {
  id: string;
  name: string;
  breed?: string;
  birthDate?: string;
  adoptedAt?: string;
  dogSize?: string;
  hasVisitedVet?: boolean;
  mainConcern?: string;
  hasDisease?: boolean;
  diseaseDetail?: string;
  visitFrequency?: string;
  livingEnv?: string;
  walkFrequency?: string;
  isMultiDog?: boolean;
  multiDogCount?: number;
  anxietyLevel?: number;
  hasCurrentInsurance?: boolean;
  currentInsuranceCost?: string;
  insuranceConcern?: string;
  vaccineSchedules: VaccineSchedule[];
}

export interface VaccineSchedule {
  id: string;
  dogId: string;
  type: string;
  scheduledDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface WalkHistory {
  id: string;
  dogId: string;
  startedAt: string;
  endedAt?: string;
  durationMin?: number;
  distanceM?: number;
  routePolyline?: string;
}

export interface UserData {
  onboarded: boolean;
  userType?: 'new_owner' | 'reviewing' | 'want_dog';
  isPremium: boolean;
}

const STORAGE_KEYS = {
  DOGS: 'wanlife_dogs',
  USER: 'wanlife_user',
  WALKS: 'wanlife_walks',
  SELECTED_DOG: 'wanlife_selected_dog',
} as const;

// ユーティリティ
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const safeGetItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const safeSetItem = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage save error:', e);
  }
};

// ===== ユーザー =====
export const getUser = (): UserData => {
  return safeGetItem<UserData>(STORAGE_KEYS.USER, {
    onboarded: false,
    isPremium: true, // デモ用にプレミアム有効
  });
};

export const saveUser = (user: Partial<UserData>): UserData => {
  const current = getUser();
  const updated = { ...current, ...user };
  safeSetItem(STORAGE_KEYS.USER, updated);
  return updated;
};

// ===== 犬 =====
export const getDogs = (): Dog[] => {
  return safeGetItem<Dog[]>(STORAGE_KEYS.DOGS, []);
};

export const getDog = (id: string): Dog | undefined => {
  const dogs = getDogs();
  return dogs.find((d) => d.id === id);
};

export const saveDog = (dog: Partial<Dog> & { name: string }): Dog => {
  const dogs = getDogs();
  const newDog: Dog = {
    id: dog.id || generateId(),
    name: dog.name,
    breed: dog.breed,
    birthDate: dog.birthDate,
    adoptedAt: dog.adoptedAt,
    dogSize: dog.dogSize,
    hasVisitedVet: dog.hasVisitedVet,
    mainConcern: dog.mainConcern,
    hasDisease: dog.hasDisease,
    diseaseDetail: dog.diseaseDetail,
    visitFrequency: dog.visitFrequency,
    livingEnv: dog.livingEnv,
    walkFrequency: dog.walkFrequency,
    isMultiDog: dog.isMultiDog,
    multiDogCount: dog.multiDogCount,
    anxietyLevel: dog.anxietyLevel,
    hasCurrentInsurance: dog.hasCurrentInsurance,
    currentInsuranceCost: dog.currentInsuranceCost,
    insuranceConcern: dog.insuranceConcern,
    vaccineSchedules: dog.vaccineSchedules || [],
  };

  const existingIndex = dogs.findIndex((d) => d.id === newDog.id);
  if (existingIndex >= 0) {
    dogs[existingIndex] = newDog;
  } else {
    dogs.push(newDog);
  }

  safeSetItem(STORAGE_KEYS.DOGS, dogs);
  return newDog;
};

export const updateDog = (id: string, updates: Partial<Dog>): Dog | null => {
  const dogs = getDogs();
  const index = dogs.findIndex((d) => d.id === id);
  if (index < 0) return null;

  dogs[index] = { ...dogs[index], ...updates };
  safeSetItem(STORAGE_KEYS.DOGS, dogs);
  return dogs[index];
};

export const deleteDog = (id: string): boolean => {
  const dogs = getDogs();
  const filtered = dogs.filter((d) => d.id !== id);
  if (filtered.length === dogs.length) return false;
  safeSetItem(STORAGE_KEYS.DOGS, filtered);
  return true;
};

// ===== 選択中の犬 =====
export const getSelectedDogId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.SELECTED_DOG);
};

export const setSelectedDogId = (id: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SELECTED_DOG, id);
};

export const getSelectedDog = (): Dog | undefined => {
  const id = getSelectedDogId();
  if (!id) {
    const dogs = getDogs();
    return dogs[0];
  }
  return getDog(id);
};

// ===== ワクチン =====
export const addVaccineSchedule = (
  dogId: string,
  vaccine: Omit<VaccineSchedule, 'id' | 'dogId'>
): VaccineSchedule | null => {
  const dogs = getDogs();
  const dogIndex = dogs.findIndex((d) => d.id === dogId);
  if (dogIndex < 0) return null;

  const newVaccine: VaccineSchedule = {
    id: generateId(),
    dogId,
    ...vaccine,
  };

  dogs[dogIndex].vaccineSchedules.push(newVaccine);
  safeSetItem(STORAGE_KEYS.DOGS, dogs);
  return newVaccine;
};

export const completeVaccine = (dogId: string, vaccineId: string): boolean => {
  const dogs = getDogs();
  const dogIndex = dogs.findIndex((d) => d.id === dogId);
  if (dogIndex < 0) return false;

  const vaccineIndex = dogs[dogIndex].vaccineSchedules.findIndex(
    (v) => v.id === vaccineId
  );
  if (vaccineIndex < 0) return false;

  dogs[dogIndex].vaccineSchedules[vaccineIndex].completed = true;
  dogs[dogIndex].vaccineSchedules[vaccineIndex].completedAt =
    new Date().toISOString();
  safeSetItem(STORAGE_KEYS.DOGS, dogs);
  return true;
};

// ===== 散歩履歴 =====
export const getWalkHistory = (dogId?: string): WalkHistory[] => {
  const walks = safeGetItem<WalkHistory[]>(STORAGE_KEYS.WALKS, []);
  if (dogId) {
    return walks.filter((w) => w.dogId === dogId);
  }
  return walks;
};

export const saveWalk = (walk: Omit<WalkHistory, 'id'>): WalkHistory => {
  const walks = getWalkHistory();
  const newWalk: WalkHistory = {
    id: generateId(),
    ...walk,
  };
  walks.push(newWalk);
  safeSetItem(STORAGE_KEYS.WALKS, walks);
  return newWalk;
};

// ===== データリセット =====
export const clearAllData = (): void => {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};
