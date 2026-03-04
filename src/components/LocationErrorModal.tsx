'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import {
  GeolocationError,
  getFriendlyErrorMessage,
  GeoLocation,
  PRESET_LOCATIONS,
} from '@/hooks/useGeolocation';

interface LocationErrorModalProps {
  error: GeolocationError;
  onRetry: () => void;
  onManualSelect: (location: GeoLocation) => void;
  onClose?: () => void;
  loading?: boolean;
}

export function LocationErrorModal({
  error,
  onRetry,
  onManualSelect,
  onClose,
  loading = false,
}: LocationErrorModalProps) {
  const [showManualSelect, setShowManualSelect] = useState(false);
  const errorInfo = getFriendlyErrorMessage(error);

  const handleRetry = () => {
    onRetry();
  };

  const handleSelectLocation = (location: GeoLocation) => {
    onManualSelect(location);
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        {!showManualSelect ? (
          <div className="text-center">
            {/* アイコン - 不安にさせないデザイン */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-3xl">
                {error === 'PERMISSION_DENIED' ? '📍' : error === 'TIMEOUT' ? '⏳' : '🗺️'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-dark-100 mb-2">
              {errorInfo.title}
            </h3>
            <p className="text-dark-400 text-sm mb-6">
              {errorInfo.message}
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                loading={loading}
                className="w-full"
              >
                {errorInfo.action}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowManualSelect(true)}
                className="w-full"
              >
                手動で地域を選択する
              </Button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full text-sm text-dark-400 hover:text-dark-200 py-2"
                >
                  後で設定する
                </button>
              )}
            </div>

            {/* ヒント */}
            {error === 'PERMISSION_DENIED' && (
              <div className="mt-6 p-3 bg-dark-700/50 rounded-lg text-left">
                <p className="text-xs text-dark-400">
                  <span className="font-bold text-dark-300">ヒント：</span>
                  <br />
                  iPhoneの場合：設定 → プライバシー → 位置情報サービス
                  <br />
                  Androidの場合：設定 → 位置情報 → アプリの権限
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-dark-100">
                地域を選択
              </h3>
              <button
                onClick={() => setShowManualSelect(false)}
                className="text-dark-400 hover:text-dark-200"
              >
                ← 戻る
              </button>
            </div>

            <p className="text-sm text-dark-400 mb-4">
              お住まいの地域に近い場所を選んでください。
              後から変更することもできます。
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {PRESET_LOCATIONS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleSelectLocation(preset.location)}
                  className="p-3 text-left bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                >
                  <span className="text-dark-100 font-medium">{preset.name}</span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-dark-500 text-center">
              選択した地域を基準に、周辺施設を検索します
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

// コンパクト版（インライン表示用）
export function LocationErrorBanner({
  error,
  onRetry,
  onManualSelect,
  loading = false,
}: Omit<LocationErrorModalProps, 'onClose'>) {
  const [showOptions, setShowOptions] = useState(false);
  const errorInfo = getFriendlyErrorMessage(error);

  return (
    <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">📍</span>
        <div className="flex-1">
          <p className="font-medium text-dark-100 text-sm">{errorInfo.title}</p>
          <p className="text-xs text-dark-400 mt-1">{errorInfo.message}</p>

          {!showOptions ? (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={onRetry}
                loading={loading}
              >
                {errorInfo.action}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowOptions(true)}
              >
                手動で設定
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-xs text-dark-400 mb-2">地域を選択:</p>
              <div className="flex flex-wrap gap-1">
                {PRESET_LOCATIONS.slice(0, 5).map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => onManualSelect(preset.location)}
                    className="px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 rounded-full text-dark-200 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
                <button
                  onClick={() => setShowOptions(false)}
                  className="px-2 py-1 text-xs text-dark-400 hover:text-dark-200"
                >
                  戻る
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
