/**
 * 位置情報管理ライブラリ
 *
 * 位置情報取得の処理フロー:
 * ① GPS（高精度）→ ② Wi-Fi/基地局 → ③ IP位置情報 → ④ 手動選択
 *
 * プライバシー配慮:
 * - リアルタイム追跡しない
 * - サーバーに保存しない
 * - コミュニティに表示しない（市区町村レベルのみ）
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'gps' | 'wifi' | 'ip' | 'manual' | 'cached';
  timestamp: number;
}

export interface LocationResult {
  success: boolean;
  location: GeoLocation | null;
  error: LocationError | null;
}

export type LocationError =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

// ローカルストレージキー
const LOCATION_CACHE_KEY = 'wanlife_location_cache';
const LOCATION_MANUAL_KEY = 'wanlife_manual_location';
const CACHE_DURATION = 5 * 60 * 1000; // 5分

/**
 * キャッシュから位置情報を取得
 */
export function getCachedLocation(): GeoLocation | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return null;

    const location: GeoLocation = JSON.parse(cached);
    const age = Date.now() - location.timestamp;

    // キャッシュが5分以内なら使用
    if (age < CACHE_DURATION) {
      return { ...location, source: 'cached' };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 位置情報をキャッシュに保存
 */
export function cacheLocation(location: GeoLocation): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch {
    // Storage full or disabled
  }
}

/**
 * 手動設定の位置情報を取得
 */
export function getManualLocation(): GeoLocation | null {
  if (typeof window === 'undefined') return null;

  try {
    const manual = localStorage.getItem(LOCATION_MANUAL_KEY);
    if (!manual) return null;
    return JSON.parse(manual);
  } catch {
    return null;
  }
}

/**
 * 手動で位置情報を設定
 */
export function setManualLocation(location: Omit<GeoLocation, 'source' | 'timestamp'>): GeoLocation {
  const fullLocation: GeoLocation = {
    ...location,
    source: 'manual',
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCATION_MANUAL_KEY, JSON.stringify(fullLocation));
    } catch {
      // Storage full or disabled
    }
  }

  return fullLocation;
}

/**
 * GPS/デバイスから位置情報を取得
 */
export async function getGPSLocation(options?: PositionOptions): Promise<LocationResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      location: null,
      error: 'NOT_SUPPORTED',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps',
          timestamp: Date.now(),
        };
        cacheLocation(location);
        resolve({ success: true, location, error: null });
      },
      (error) => {
        let errorType: LocationError;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorType = 'PERMISSION_DENIED';
            break;
          case error.POSITION_UNAVAILABLE:
            errorType = 'POSITION_UNAVAILABLE';
            break;
          case error.TIMEOUT:
            errorType = 'TIMEOUT';
            break;
          default:
            errorType = 'UNKNOWN';
        }
        resolve({ success: false, location: null, error: errorType });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        ...options,
      }
    );
  });
}

/**
 * IP位置情報を取得（フォールバック用）
 * 無料APIを使用 - 精度は低いが動作保証
 */
export async function getIPLocation(): Promise<LocationResult> {
  try {
    // 複数のAPIを試行（1つ目が失敗したら2つ目）
    const apis = [
      'https://ipapi.co/json/',
      'https://ip-api.com/json/',
    ];

    for (const api of apis) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(api, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();

        // ipapi.co形式
        if (data.latitude && data.longitude) {
          const location: GeoLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: 10000, // IP位置情報は精度が低い（約10km）
            source: 'ip',
            timestamp: Date.now(),
          };
          cacheLocation(location);
          return { success: true, location, error: null };
        }

        // ip-api.com形式
        if (data.lat && data.lon) {
          const location: GeoLocation = {
            latitude: data.lat,
            longitude: data.lon,
            accuracy: 10000,
            source: 'ip',
            timestamp: Date.now(),
          };
          cacheLocation(location);
          return { success: true, location, error: null };
        }
      } catch {
        continue;
      }
    }

    return {
      success: false,
      location: null,
      error: 'NETWORK_ERROR',
    };
  } catch {
    return {
      success: false,
      location: null,
      error: 'NETWORK_ERROR',
    };
  }
}

/**
 * 位置情報を取得（フォールバック付き）
 *
 * 処理フロー:
 * 1. キャッシュをチェック（5分以内）
 * 2. GPS取得を試行
 * 3. 失敗した場合、IP位置情報を試行
 * 4. 手動設定があればそれを使用
 */
export async function getLocationWithFallback(): Promise<LocationResult> {
  // 1. キャッシュをチェック
  const cached = getCachedLocation();
  if (cached) {
    return { success: true, location: cached, error: null };
  }

  // 2. GPS取得を試行
  const gpsResult = await getGPSLocation();
  if (gpsResult.success) {
    return gpsResult;
  }

  // 3. 権限拒否以外のエラーならIP位置情報を試行
  if (gpsResult.error !== 'PERMISSION_DENIED') {
    const ipResult = await getIPLocation();
    if (ipResult.success) {
      return ipResult;
    }
  }

  // 4. 手動設定があればそれを使用
  const manual = getManualLocation();
  if (manual) {
    return { success: true, location: manual, error: null };
  }

  // すべて失敗
  return gpsResult;
}

/**
 * 位置情報の権限状態を確認
 */
export async function checkLocationPermission(): Promise<PermissionState | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions) {
    return null;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return null;
  }
}

/**
 * 東京23区のプリセット位置（手動選択用）
 */
export const TOKYO_AREAS = [
  { name: '渋谷区', latitude: 35.6619, longitude: 139.7041 },
  { name: '新宿区', latitude: 35.6938, longitude: 139.7034 },
  { name: '港区', latitude: 35.6581, longitude: 139.7514 },
  { name: '目黒区', latitude: 35.6414, longitude: 139.6982 },
  { name: '世田谷区', latitude: 35.6461, longitude: 139.6531 },
  { name: '品川区', latitude: 35.6090, longitude: 139.7302 },
  { name: '大田区', latitude: 35.5613, longitude: 139.7160 },
  { name: '杉並区', latitude: 35.6994, longitude: 139.6366 },
  { name: '中野区', latitude: 35.7078, longitude: 139.6638 },
  { name: '練馬区', latitude: 35.7355, longitude: 139.6517 },
  { name: '豊島区', latitude: 35.7263, longitude: 139.7168 },
  { name: '板橋区', latitude: 35.7509, longitude: 139.7092 },
  { name: '北区', latitude: 35.7528, longitude: 139.7337 },
  { name: '荒川区', latitude: 35.7365, longitude: 139.7834 },
  { name: '足立区', latitude: 35.7748, longitude: 139.8046 },
  { name: '葛飾区', latitude: 35.7437, longitude: 139.8472 },
  { name: '江戸川区', latitude: 35.7065, longitude: 139.8682 },
  { name: '江東区', latitude: 35.6727, longitude: 139.8170 },
  { name: '墨田区', latitude: 35.7107, longitude: 139.8013 },
  { name: '台東区', latitude: 35.7127, longitude: 139.7800 },
  { name: '文京区', latitude: 35.7081, longitude: 139.7521 },
  { name: '千代田区', latitude: 35.6940, longitude: 139.7536 },
  { name: '中央区', latitude: 35.6703, longitude: 139.7719 },
];

/**
 * 主要都市のプリセット位置
 */
export const MAJOR_CITIES = [
  { name: '横浜市', latitude: 35.4437, longitude: 139.6380 },
  { name: 'さいたま市', latitude: 35.8617, longitude: 139.6455 },
  { name: '千葉市', latitude: 35.6074, longitude: 140.1065 },
  { name: '川崎市', latitude: 35.5309, longitude: 139.7029 },
  { name: '大阪市', latitude: 34.6937, longitude: 135.5023 },
  { name: '名古屋市', latitude: 35.1815, longitude: 136.9066 },
  { name: '札幌市', latitude: 43.0618, longitude: 141.3545 },
  { name: '福岡市', latitude: 33.5904, longitude: 130.4017 },
  { name: '神戸市', latitude: 34.6901, longitude: 135.1956 },
  { name: '京都市', latitude: 35.0116, longitude: 135.7681 },
];

/**
 * エラーメッセージを取得（ユーザーフレンドリー）
 */
export function getLocationErrorInfo(error: LocationError): {
  title: string;
  message: string;
  canRetry: boolean;
  showManualOption: boolean;
} {
  switch (error) {
    case 'PERMISSION_DENIED':
      return {
        title: '位置情報をオンにしましょう',
        message: '近くの散歩コースや動物病院を見つけるために、位置情報の許可が必要です。',
        canRetry: true,
        showManualOption: true,
      };
    case 'POSITION_UNAVAILABLE':
      return {
        title: '現在地を取得できませんでした',
        message: '電波状況をご確認いただくか、手動で地域を選択してください。',
        canRetry: true,
        showManualOption: true,
      };
    case 'TIMEOUT':
      return {
        title: '取得に時間がかかっています',
        message: '再度お試しいただくか、手動で地域を指定できます。',
        canRetry: true,
        showManualOption: true,
      };
    case 'NOT_SUPPORTED':
      return {
        title: '位置情報を手動で設定',
        message: 'お使いの環境では自動取得ができません。お住まいの地域を選択してください。',
        canRetry: false,
        showManualOption: true,
      };
    case 'NETWORK_ERROR':
      return {
        title: 'ネットワークエラー',
        message: 'インターネット接続をご確認ください。',
        canRetry: true,
        showManualOption: true,
      };
    default:
      return {
        title: 'エラーが発生しました',
        message: '位置情報の取得に失敗しました。',
        canRetry: true,
        showManualOption: true,
      };
  }
}

/**
 * Googleマップで経路を開く
 */
export function openGoogleMapsDirections(
  origin: GeoLocation,
  destination: { name?: string; address?: string; lat?: number; lng?: number },
  travelMode: 'walking' | 'driving' | 'transit' = 'walking'
): void {
  const originStr = `${origin.latitude},${origin.longitude}`;

  let destinationStr: string;
  if (destination.lat && destination.lng) {
    destinationStr = `${destination.lat},${destination.lng}`;
  } else if (destination.address) {
    destinationStr = encodeURIComponent(destination.address);
  } else if (destination.name) {
    destinationStr = encodeURIComponent(destination.name);
  } else {
    return;
  }

  const url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destinationStr}&travelmode=${travelMode}`;
  window.open(url, '_blank');
}

/**
 * Googleマップで場所を検索
 */
export function openGoogleMapsSearch(query: string): void {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(url, '_blank');
}
