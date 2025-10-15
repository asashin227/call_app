/**
 * UUIDv4を生成するユーティリティ関数
 * CallKeepなどで使用する標準的なUUID形式 (XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX) を生成
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

