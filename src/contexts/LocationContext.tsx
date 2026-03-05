'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  GeoLocation,
  LocationError,
  getLocationWithFallback,
  getGPSLocation,
  setManualLocation as saveManualLocation,
  getCachedLocation,
  getManualLocation,
  checkLocationPermission,
} from '@/lib/location';

interface LocationContextType {
  // 状態
  location: GeoLocation | null;
  loading: boolean;
  error: LocationError | null;
  permissionState: PermissionState | null;
  isLocationReady: boolean;

  // アクション
  requestLocation: () => Promise<GeoLocation | null>;
  refreshLocation: () => Promise<GeoLocation | null>;
  setManualLocation: (lat: number, lng: number, areaName?: string) => void;
  clearError: () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

  // 初期化：キャッシュまたは手動設定を読み込み
  useEffect(() => {
    const cached = getCachedLocation();
    if (cached) {
      setLocation(cached);
      return;
    }

    const manual = getManualLocation();
    if (manual) {
      setLocation(manual);
    }

    // 権限状態を確認
    checkLocationPermission().then(state => {
      setPermissionState(state);
    });
  }, []);

  // 位置情報を要求（フォールバック付き）
  const requestLocation = useCallback(async (): Promise<GeoLocation | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await getLocationWithFallback();

      if (result.success && result.location) {
        setLocation(result.location);
        setPermissionState('granted');
        return result.location;
      }

      if (result.error) {
        setError(result.error);
        if (result.error === 'PERMISSION_DENIED') {
          setPermissionState('denied');
        }
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 位置情報を強制更新（GPSのみ）
  const refreshLocation = useCallback(async (): Promise<GeoLocation | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await getGPSLocation({ maximumAge: 0 });

      if (result.success && result.location) {
        setLocation(result.location);
        setPermissionState('granted');
        return result.location;
      }

      if (result.error) {
        setError(result.error);
        if (result.error === 'PERMISSION_DENIED') {
          setPermissionState('denied');
        }
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 手動で位置を設定
  const setManualLocationHandler = useCallback((lat: number, lng: number) => {
    const newLocation = saveManualLocation({
      latitude: lat,
      longitude: lng,
      accuracy: 1000,
    });
    setLocation(newLocation);
    setError(null);
  }, []);

  // エラーをクリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isLocationReady = location !== null;

  return (
    <LocationContext.Provider
      value={{
        location,
        loading,
        error,
        permissionState,
        isLocationReady,
        requestLocation,
        refreshLocation,
        setManualLocation: setManualLocationHandler,
        clearError,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
