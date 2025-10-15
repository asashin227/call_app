import { deflate, inflate } from 'pako';

/**
 * JSON データを圧縮してBase64エンコードします（QRコード用）
 * @param data - 圧縮するJSONオブジェクト
 * @returns Base64エンコードされた圧縮データ
 */
export function compressForQRCode(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = deflate(jsonString);
    const base64 = btoa(String.fromCharCode(...compressed));
    return base64;
  } catch (error) {
    console.error('Failed to compress data:', error);
    throw new Error('データの圧縮に失敗しました');
  }
}

/**
 * Base64エンコードされた圧縮データを解凍してJSONオブジェクトに戻します
 * @param compressed - Base64エンコードされた圧縮データ
 * @returns 解凍されたJSONオブジェクト
 */
export function decompressFromQRCode(compressed: string): any {
  try {
    const binaryString = atob(compressed);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decompressed = inflate(bytes, { to: 'string' });
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Failed to decompress data:', error);
    throw new Error('データの解凍に失敗しました');
  }
}

