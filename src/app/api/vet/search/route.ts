import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// 動物病院検索API（Yahoo! YOLP対応）
// ================================================

interface VetClinic {
  id: string;
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  reviewCount?: number;
  distance: number;
  distanceText: string;
  features?: string[];
  businessHours?: Record<string, string>;
  googleMapsUrl: string;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function generateMapUrl(userLat: number, userLon: number, placeLat: number, placeLon: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${placeLat},${placeLon}&travelmode=driving`;
}

// Yahoo! YOLP で動物病院を検索
async function searchYahooYOLP(
  lat: number,
  lng: number,
  radius: number,
  appId: string
): Promise<VetClinic[]> {
  const clinics: VetClinic[] = [];

  try {
    const params = new URLSearchParams({
      appid: appId,
      lat: lat.toString(),
      lon: lng.toString(),
      dist: (radius / 1000).toString(),
      query: '動物病院',
      results: '30',
      output: 'json',
      sort: 'dist',
    });

    const url = `https://map.yahooapis.jp/search/local/V1/localSearch?${params}`;
    console.log('[Yahoo YOLP] 動物病院検索中...');

    const response = await fetch(url, {
      headers: { 'User-Agent': 'WansapoApp/1.0' },
    });

    if (!response.ok) {
      console.error('[Yahoo YOLP] Error:', response.status);
      return clinics;
    }

    const data = await response.json();

    if (data.Feature) {
      for (const feature of data.Feature) {
        const geometry = feature.Geometry?.Coordinates;
        if (!geometry) continue;

        const [lon, placeLat] = geometry.split(',').map(Number);
        const property = feature.Property || {};
        const distance = calculateDistance(lat, lng, placeLat, lon);

        // 特徴を抽出
        const features: string[] = [];
        const catchcopy = property.CatchCopy || '';
        if (catchcopy.includes('24時間') || catchcopy.includes('夜間')) features.push('夜間対応');
        if (catchcopy.includes('駐車')) features.push('駐車場あり');
        if (catchcopy.includes('日曜') || catchcopy.includes('休日')) features.push('日曜診療');
        if (catchcopy.includes('予約')) features.push('予約制');
        if (catchcopy.includes('救急')) features.push('救急対応');

        clinics.push({
          id: `yahoo-vet-${feature.Id || Math.random().toString(36).substr(2, 9)}`,
          name: feature.Name || '名称不明',
          address: property.Address || '',
          phone: property.Tel1,
          latitude: placeLat,
          longitude: lon,
          distance,
          distanceText: formatDistance(distance),
          features: features.length > 0 ? features : undefined,
          googleMapsUrl: generateMapUrl(lat, lng, placeLat, lon),
        });
      }
    }

    console.log(`[Yahoo YOLP] ${clinics.length}件の動物病院を取得`);
  } catch (error) {
    console.error('[Yahoo YOLP] Error:', error);
  }

  return clinics;
}

// OpenStreetMap フォールバック
async function searchOverpassFallback(
  lat: number,
  lng: number,
  radius: number
): Promise<VetClinic[]> {
  const clinics: VetClinic[] = [];

  try {
    const overpassQuery = `[out:json][timeout:25];
(
  node["amenity"="veterinary"](around:${radius},${lat},${lng});
  way["amenity"="veterinary"](around:${radius},${lat},${lng});
  node["healthcare"="veterinary"](around:${radius},${lat},${lng});
);
out center body;`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.elements) {
        for (const element of data.elements) {
          const placeLat = element.lat || element.center?.lat;
          const placeLon = element.lon || element.center?.lon;
          const tags = element.tags || {};

          if (!placeLat || !placeLon || !tags.name) continue;

          const distance = calculateDistance(lat, lng, placeLat, placeLon);

          clinics.push({
            id: `osm-vet-${element.id}`,
            name: tags['name:ja'] || tags.name,
            address: tags['addr:full'] || tags.address || '住所情報なし',
            phone: tags.phone,
            latitude: placeLat,
            longitude: placeLon,
            distance,
            distanceText: formatDistance(distance),
            googleMapsUrl: generateMapUrl(lat, lng, placeLat, placeLon),
          });
        }
      }
    }
  } catch (error) {
    console.error('[Overpass] Error:', error);
  }

  return clinics;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseInt(searchParams.get('radius') || '3000', 10);

    if (lat === 0 || lng === 0) {
      return NextResponse.json({ error: '位置情報が必要です' }, { status: 400 });
    }

    console.log(`[Vet API] 検索: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}, radius=${radius}m`);

    const yahooAppId = process.env.YAHOO_APP_ID;
    let clinics: VetClinic[];

    if (yahooAppId) {
      clinics = await searchYahooYOLP(lat, lng, radius, yahooAppId);

      // 結果が少ない場合はOSMで補完
      if (clinics.length < 5) {
        const osmClinics = await searchOverpassFallback(lat, lng, radius);
        for (const osm of osmClinics) {
          if (!clinics.find(c => c.name === osm.name)) {
            clinics.push(osm);
          }
        }
      }
    } else {
      clinics = await searchOverpassFallback(lat, lng, radius);
    }

    // 距離でソート
    clinics.sort((a, b) => a.distance - b.distance);

    // 重複除去
    const unique = clinics.filter((c, i, self) =>
      i === self.findIndex(x => x.name === c.name)
    );

    return NextResponse.json({
      clinics: unique,
      total: unique.length,
    });
  } catch (error) {
    console.error('Vet API error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
