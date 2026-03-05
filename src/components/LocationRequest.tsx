'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import {
  GeoLocation,
  LocationError,
  getLocationErrorInfo,
  TOKYO_AREAS,
  MAJOR_CITIES,
} from '@/lib/location';

interface LocationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationObtained: (location: GeoLocation) => void;
  onRetry: () => Promise<GeoLocation | null>;
  onManualSelect: (lat: number, lng: number) => void;
  error: LocationError | null;
  loading: boolean;
}

/**
 * 位置情報取得モーダル
 */
export function LocationRequestModal({
  isOpen,
  onClose,
  onLocationObtained,
  onRetry,
  onManualSelect,
  error,
  loading,
}: LocationRequestModalProps) {
  const [view, setView] = useState<'request' | 'error' | 'manual'>('request');
  const [selectedArea, setSelectedArea] = useState<'tokyo' | 'other'>('tokyo');

  useEffect(() => {
    if (error) {
      setView('error');
    }
  }, [error]);

  if (!isOpen) return null;

  const errorInfo = error ? getLocationErrorInfo(error) : null;

  const handleRetry = async () => {
    const location = await onRetry();
    if (location) {
      onLocationObtained(location);
      onClose();
    }
  };

  const handleManualSelect = (lat: number, lng: number) => {
    onManualSelect(lat, lng);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-brown-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full max-h-[80vh] overflow-y-auto shadow-soft-lg">
        {/* 初回リクエスト画面 */}
        {view === 'request' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-100 to-peach-100 flex items-center justify-center shadow-sm">
              <span className="text-4xl">📍</span>
            </div>

            <h2 className="text-xl font-bold text-brown-700 mb-3">
              位置情報を使用します
            </h2>

            <p className="text-brown-500 text-sm mb-6 leading-relaxed">
              近くの散歩コース、動物病院、ドッグランを
              見つけるために現在地を使用します。
            </p>

            {/* プライバシー説明 */}
            <div className="bg-cream-50 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-brown-600 mb-2 font-medium">🔒 プライバシーについて</p>
              <ul className="text-xs text-brown-400 space-y-1">
                <li>• 位置情報はサーバーに保存されません</li>
                <li>• リアルタイム追跡は行いません</li>
                <li>• コミュニティには市区町村名のみ表示</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                loading={loading}
                className="w-full"
              >
                現在地を取得する
              </Button>

              <Button
                variant="secondary"
                onClick={() => setView('manual')}
                className="w-full"
              >
                手動で地域を選択
              </Button>

              <button
                onClick={onClose}
                className="w-full text-sm text-brown-400 hover:text-brown-600 py-2"
              >
                後で設定する
              </button>
            </div>
          </div>
        )}

        {/* エラー画面 */}
        {view === 'error' && errorInfo && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-peach-100 flex items-center justify-center">
              <span className="text-3xl">
                {error === 'PERMISSION_DENIED' ? '🔒' : '📍'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-brown-700 mb-2">
              {errorInfo.title}
            </h3>
            <p className="text-brown-500 text-sm mb-6">
              {errorInfo.message}
            </p>

            <div className="space-y-3">
              {errorInfo.canRetry && (
                <Button
                  onClick={handleRetry}
                  loading={loading}
                  className="w-full"
                >
                  もう一度試す
                </Button>
              )}

              {errorInfo.showManualOption && (
                <Button
                  variant="secondary"
                  onClick={() => setView('manual')}
                  className="w-full"
                >
                  手動で地域を選択
                </Button>
              )}

              <button
                onClick={onClose}
                className="w-full text-sm text-brown-400 hover:text-brown-600 py-2"
              >
                後で設定する
              </button>
            </div>

            {/* iOSの設定ヒント */}
            {error === 'PERMISSION_DENIED' && (
              <div className="mt-6 p-4 bg-cream-50 rounded-2xl text-left">
                <p className="text-xs text-brown-600 font-medium">設定方法：</p>
                <p className="text-xs text-brown-400 mt-1">
                  iPhone：設定 → プライバシー → 位置情報サービス
                </p>
                <p className="text-xs text-brown-400">
                  Android：設定 → 位置情報 → アプリの権限
                </p>
              </div>
            )}
          </div>
        )}

        {/* 手動選択画面 */}
        {view === 'manual' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brown-700">
                地域を選択
              </h3>
              <button
                onClick={() => setView(error ? 'error' : 'request')}
                className="text-accent font-medium text-sm"
              >
                ← 戻る
              </button>
            </div>

            <p className="text-sm text-brown-500 mb-4">
              お住まいの地域に近い場所を選んでください。
            </p>

            {/* エリア切り替え */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSelectedArea('tokyo')}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedArea === 'tokyo'
                    ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                    : 'bg-cream-100 text-brown-600'
                }`}
              >
                東京23区
              </button>
              <button
                onClick={() => setSelectedArea('other')}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedArea === 'other'
                    ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                    : 'bg-cream-100 text-brown-600'
                }`}
              >
                その他の都市
              </button>
            </div>

            {/* エリアリスト */}
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {(selectedArea === 'tokyo' ? TOKYO_AREAS : MAJOR_CITIES).map((area) => (
                <button
                  key={area.name}
                  onClick={() => handleManualSelect(area.latitude, area.longitude)}
                  className="p-2 text-sm text-left bg-cream-50 hover:bg-cream-100 rounded-xl transition-colors text-brown-600 hover:text-brown-700"
                >
                  {area.name}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-brown-400 text-center">
              選択した地域を基準に周辺施設を検索します
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * 位置情報エラーバナー（インライン表示用）
 */
interface LocationErrorBannerProps {
  error: LocationError;
  onRetry: () => void;
  onManualSelect: () => void;
  loading?: boolean;
}

export function LocationErrorBanner({
  error,
  onRetry,
  onManualSelect,
  loading = false,
}: LocationErrorBannerProps) {
  const errorInfo = getLocationErrorInfo(error);

  return (
    <div className="bg-gradient-to-r from-peach-50 to-pink-50 border border-peach-200 rounded-2xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">📍</span>
        <div className="flex-1">
          <p className="font-medium text-brown-700 text-sm">{errorInfo.title}</p>
          <p className="text-xs text-brown-500 mt-1">{errorInfo.message}</p>

          <div className="flex gap-2 mt-3">
            {errorInfo.canRetry && (
              <Button
                size="sm"
                onClick={onRetry}
                loading={loading}
              >
                再取得
              </Button>
            )}
            {errorInfo.showManualOption && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onManualSelect}
              >
                手動で設定
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 位置情報必須画面（位置情報がないと使えない機能用）
 */
interface LocationRequiredProps {
  onRequestLocation: () => Promise<GeoLocation | null>;
  onManualSelect: (lat: number, lng: number) => void;
  loading: boolean;
  featureName: string;
}

export function LocationRequired({
  onRequestLocation,
  onManualSelect,
  loading,
  featureName,
}: LocationRequiredProps) {
  const [showManual, setShowManual] = useState(false);
  const [selectedArea, setSelectedArea] = useState<'tokyo' | 'other'>('tokyo');

  if (showManual) {
    return (
      <div className="text-center py-8">
        <button
          onClick={() => setShowManual(false)}
          className="text-sm text-accent font-medium mb-4"
        >
          ← 戻る
        </button>

        <h3 className="text-lg font-bold text-brown-700 mb-4">地域を選択</h3>

        <div className="flex gap-2 mb-4 justify-center">
          <button
            onClick={() => setSelectedArea('tokyo')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedArea === 'tokyo'
                ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                : 'bg-cream-100 text-brown-600'
            }`}
          >
            東京23区
          </button>
          <button
            onClick={() => setSelectedArea('other')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedArea === 'other'
                ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                : 'bg-cream-100 text-brown-600'
            }`}
          >
            その他
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {(selectedArea === 'tokyo' ? TOKYO_AREAS.slice(0, 12) : MAJOR_CITIES).map((area) => (
            <button
              key={area.name}
              onClick={() => onManualSelect(area.latitude, area.longitude)}
              className="p-2 text-sm bg-cream-50 hover:bg-cream-100 rounded-xl transition-colors text-brown-600 hover:text-brown-700"
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-100 to-peach-100 flex items-center justify-center shadow-sm">
        <span className="text-4xl">📍</span>
      </div>

      <h3 className="text-xl font-bold text-brown-700 mb-3">
        位置情報が必要です
      </h3>

      <p className="text-brown-500 mb-6 max-w-xs mx-auto">
        {featureName}を使うには、現在地の取得が必要です。
      </p>

      <div className="space-y-3 max-w-xs mx-auto">
        <Button
          onClick={onRequestLocation}
          loading={loading}
          className="w-full"
        >
          現在地を取得する
        </Button>

        <Button
          variant="secondary"
          onClick={() => setShowManual(true)}
          className="w-full"
        >
          手動で地域を選択
        </Button>
      </div>
    </div>
  );
}
