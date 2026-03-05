/**
 * PWAアイコン生成スクリプト
 *
 * 使用方法:
 * 1. npm install sharp
 * 2. node scripts/generate-icons.js
 *
 * または、以下のオンラインツールを使用:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 *
 * public/icons/icon.svg をアップロードして各サイズのPNGを生成してください。
 */

const fs = require('fs');
const path = require('path');

// sharpがインストールされている場合
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('sharpがインストールされていません。');
  console.log('npm install sharp を実行するか、オンラインツールを使用してください。');
  console.log('');
  console.log('推奨オンラインツール:');
  console.log('- https://realfavicongenerator.net/');
  console.log('- https://www.pwabuilder.com/imageGenerator');
  console.log('');
  console.log('public/icons/icon.svg をアップロードしてください。');
  process.exit(0);
}

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SVG_PATH = path.join(__dirname, '../public/icons/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  console.log('アイコンを生成中...');

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

    await sharp(SVG_PATH)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}.png`);
  }

  // マスカブルアイコン（パディング付き）
  for (const size of [192, 512]) {
    const outputPath = path.join(OUTPUT_DIR, `icon-maskable-${size}.png`);
    const padding = Math.floor(size * 0.1);
    const innerSize = size - padding * 2;

    await sharp(SVG_PATH)
      .resize(innerSize, innerSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 133, b: 133, alpha: 1 }
      })
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-maskable-${size}.png`);
  }

  console.log('完了!');
}

generateIcons().catch(console.error);
