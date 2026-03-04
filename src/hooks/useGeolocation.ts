'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeolocationState {
  location: GeoLocation | null;
  error: GeolocationError | null;
  loading: boolean;
  permissionState: PermissionState | null;
}

export type GeolocationError =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED'
  | 'UNKNOWN';

const ERROR_MESSAGES: Record<GeolocationError, string> = {
  PERMISSION_DENIED: '位置情報の利用が許可されていません。設定から許可してください。',
  POSITION_UNAVAILABLE: '現在地を取得できませんでした。電波状況をご確認ください。',
  TIMEOUT: '位置情報の取得に時間がかかっています。もう一度お試しください。',
  NOT_SUPPORTED: 'お使いのブラウザは位置情報に対応していません。',
  UNKNOWN: '位置情報の取得中にエラーが発生しました。',
};

// エラーコードを内部エラータイプに変換
function getErrorType(error: GeolocationPositionError): GeolocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'PERMISSION_DENIED';
    case error.POSITION_UNAVAILABLE:
      return 'POSITION_UNAVAILABLE';
    case error.TIMEOUT:
      return 'TIMEOUT';
    default:
      return 'UNKNOWN';
  }
}

export function getErrorMessage(error: GeolocationError): string {
  return ERROR_MESSAGES[error];
}

// ユーザーフレンドリーなエラーメッセージ（不安にさせない表現）
export function getFriendlyErrorMessage(error: GeolocationError): {
  title: string;
  message: string;
  action: string;
} {
  switch (error) {
    case 'PERMISSION_DENIED':
      return {
        title: '位置情報をオンにしましょう',
        message: '現在地を使うと、近くの散歩コースや動物病院を見つけやすくなります。',
        action: '設定を開く',
      };
    case 'POSITION_UNAVAILABLE':
      return {
        title: '現在地を確認中...',
        message: '電波状況によっては少し時間がかかることがあります。',
        action: 'もう一度試す',
      };
    case 'TIMEOUT':
      return {
        title: 'もう少しお待ちください',
        message: '現在地の取得に時間がかかっています。再度お試しいただくか、手動で場所を指定できます。',
        action: '再取得する',
      };
    case 'NOT_SUPPORTED':
      return {
        title: '位置情報を手動で設定',
        message: 'お使いの環境では自動取得ができないため、お住まいの地域を選択してください。',
        action: '地域を選択',
      };
    default:
      return {
        title: 'うまくいきませんでした',
        message: '位置情報の取得に失敗しました。手動で場所を指定することもできます。',
        action: '再試行する',
      };
  }
}

export function useGeolocation(options?: PositionOptions) {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    permissionState: null,
  });

  // 位置情報の権限状態を確認
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) return null;
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setState(prev => ({ ...prev, permissionState: result.state }));
      return result.state;
    } catch {
      return null;
    }
  }, []);

  // 位置情報を取得
  const getCurrentLocation = useCallback(async (): Promise<GeoLocation | null> => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'NOT_SUPPORTED',
        loading: false,
      }));
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GeoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setState({
            location,
            error: null,
            loading: false,
            permissionState: 'granted',
          });
          resolve(location);
        },
        (error) => {
          const errorType = getErrorType(error);
          setState(prev => ({
            ...prev,
            error: errorType,
            loading: false,
            permissionState: errorType === 'PERMISSION_DENIED' ? 'denied' : prev.permissionState,
          }));
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // 1分間キャッシュ
          ...options,
        }
      );
    });
  }, [options]);

  // 手動で位置を設定
  const setManualLocation = useCallback((location: GeoLocation) => {
    setState({
      location,
      error: null,
      loading: false,
      permissionState: 'granted',
    });
  }, []);

  // エラーをクリア
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 初回マウント時に権限を確認
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    ...state,
    getCurrentLocation,
    setManualLocation,
    checkPermission,
    clearError,
  };
}

// 東京23区のプリセット位置（手動選択用）
export const PRESET_LOCATIONS: { name: string; location: GeoLocation }[] = [
  { name: '渋谷区', location: { latitude: 35.6619, longitude: 139.7041, accuracy: 1000 } },
  { name: '新宿区', location: { latitude: 35.6938, longitude: 139.7034, accuracy: 1000 } },
  { name: '港区', location: { latitude: 35.6581, longitude: 139.7514, accuracy: 1000 } },
  { name: '目黒区', location: { latitude: 35.6414, longitude: 139.6982, accuracy: 1000 } },
  { name: '世田谷区', location: { latitude: 35.6461, longitude: 139.6531, accuracy: 1000 } },
  { name: '品川区', location: { latitude: 35.6090, longitude: 139.7302, accuracy: 1000 } },
  { name: '大田区', location: { latitude: 35.5613, longitude: 139.7160, accuracy: 1000 } },
  { name: '杉並区', location: { latitude: 35.6994, longitude: 139.6366, accuracy: 1000 } },
  { name: '中野区', location: { latitude: 35.7078, longitude: 139.6638, accuracy: 1000 } },
  { name: '練馬区', location: { latitude: 35.7355, longitude: 139.6517, accuracy: 1000 } },
];
