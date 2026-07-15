import { InvalidInputError } from '../application/errors.js';

export function encodeCursor(token: string | undefined): string | null {
  return token ? Buffer.from(token, 'utf8').toString('base64url') : null;
}

export function decodeCursor(cursor: string | undefined): string | undefined {
  if (!cursor) return undefined;
  try {
    const token = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!token) throw new Error('empty cursor');
    return token;
  } catch (error) {
    throw new InvalidInputError('カーソルの形式が正しくありません', { cause: error });
  }
}
