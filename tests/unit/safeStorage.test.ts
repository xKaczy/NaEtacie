import { describe, it, expect, beforeEach } from 'vitest';
import { safeGetItem, safeSetItem, safeRemoveItem, safeClear } from '@/lib/offline/safeStorage';

describe('Safe LocalStorage Utility', () => {
  beforeEach(() => {
    safeClear();
  });

  it('safely sets and retrieves items', () => {
    safeSetItem('test_key', 'test_value');
    expect(safeGetItem('test_key')).toBe('test_value');
  });

  it('returns default value when key does not exist', () => {
    expect(safeGetItem('non_existent', 'default_val')).toBe('default_val');
  });

  it('removes items safely', () => {
    safeSetItem('temp_key', '123');
    expect(safeGetItem('temp_key')).toBe('123');
    safeRemoveItem('temp_key');
    expect(safeGetItem('temp_key')).toBeNull();
  });
});
