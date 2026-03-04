'use client';

import { useState, useRef, useEffect } from 'react';

// 人気の犬種リスト（日本で人気順）
const DOG_BREEDS = [
  // 小型犬
  'トイプードル',
  'チワワ',
  'ミニチュアダックスフンド',
  'ポメラニアン',
  'ヨークシャーテリア',
  'シーズー',
  'マルチーズ',
  'パピヨン',
  'ミニチュアシュナウザー',
  'キャバリア・キング・チャールズ・スパニエル',
  'ペキニーズ',
  'ビションフリーゼ',
  'パグ',
  'イタリアングレーハウンド',
  'ジャックラッセルテリア',
  'ウェストハイランドホワイトテリア',
  'ボストンテリア',
  'スコティッシュテリア',
  'ノーフォークテリア',
  'ワイヤーフォックステリア',

  // 中型犬
  '柴犬',
  'コーギー',
  'フレンチブルドッグ',
  'ビーグル',
  'コッカースパニエル',
  'ボーダーコリー',
  'シェルティ',
  'バセットハウンド',
  '日本スピッツ',
  '紀州犬',
  '甲斐犬',
  '四国犬',
  '北海道犬',
  'ブルドッグ',
  'ブルテリア',
  'ダルメシアン',

  // 大型犬
  'ゴールデンレトリバー',
  'ラブラドールレトリバー',
  'ジャーマンシェパード',
  'シベリアンハスキー',
  'ドーベルマン',
  'ボクサー',
  'バーニーズマウンテンドッグ',
  'グレートデン',
  'グレートピレニーズ',
  'ロットワイラー',
  'セントバーナード',
  'アイリッシュセッター',
  'ワイマラナー',
  'ニューファンドランド',
  '秋田犬',

  // その他
  'ミックス',
  '雑種',
  'その他',
];

interface BreedAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (breed: string) => void;
  placeholder?: string;
  className?: string;
}

export function BreedAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = '犬種を入力してください',
  className = '',
}: BreedAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredBreeds, setFilteredBreeds] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // フィルタリング
  useEffect(() => {
    if (value.trim() === '') {
      // 空の場合は人気上位10件を表示
      setFilteredBreeds(DOG_BREEDS.slice(0, 10));
    } else {
      // 入力値で始まる犬種を優先、含む犬種を次に
      const searchLower = value.toLowerCase();
      const startsWith = DOG_BREEDS.filter(
        breed => breed.toLowerCase().startsWith(searchLower)
      );
      const includes = DOG_BREEDS.filter(
        breed =>
          breed.toLowerCase().includes(searchLower) &&
          !breed.toLowerCase().startsWith(searchLower)
      );
      setFilteredBreeds([...startsWith, ...includes].slice(0, 10));
    }
    setHighlightedIndex(-1);
  }, [value]);

  // キーボード操作
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredBreeds.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredBreeds[highlightedIndex]) {
          selectBreed(filteredBreeds[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const selectBreed = (breed: string) => {
    onChange(breed);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect?.(breed);
  };

  // スクロールハイライト
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-dark-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all duration-200 bg-dark-800 text-dark-100 text-center text-lg"
        autoComplete="off"
      />

      {/* サジェストドロップダウン */}
      {isOpen && filteredBreeds.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-dark-800 border border-dark-600 rounded-xl shadow-lg"
        >
          {value.trim() === '' && (
            <li className="px-4 py-2 text-xs text-dark-500 border-b border-dark-700">
              人気の犬種
            </li>
          )}
          {filteredBreeds.map((breed, index) => (
            <li
              key={breed}
              onClick={() => selectBreed(breed)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                highlightedIndex === index
                  ? 'bg-accent/20 text-accent'
                  : 'text-dark-200 hover:bg-dark-700'
              }`}
            >
              {breed}
            </li>
          ))}
        </ul>
      )}

      {/* 入力中で候補がない場合 */}
      {isOpen && value.trim() !== '' && filteredBreeds.length === 0 && (
        <div className="absolute z-50 w-full mt-1 p-4 bg-dark-800 border border-dark-600 rounded-xl shadow-lg">
          <p className="text-dark-400 text-sm text-center">
            「{value}」に一致する犬種が見つかりません
          </p>
          <p className="text-dark-500 text-xs text-center mt-1">
            そのまま入力して続けることもできます
          </p>
        </div>
      )}
    </div>
  );
}

// 犬種リストをエクスポート（他のコンポーネントで使用可能）
export { DOG_BREEDS };
