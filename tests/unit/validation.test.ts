/**
 * Round80 (3.5) — boundary tests for src/lib/validation.ts.
 * The shared field constraints are the single source of truth for credential
 * policy (merged in round79 Stage D); these tests pin the exact boundaries so
 * future edits cannot silently widen or narrow them.
 */
import { describe, it, expect } from 'vitest';
import {
  usernameField,
  usernameOptional,
  usernamePresence,
  passwordField,
  passwordOptional,
  passwordPresence,
  nameField,
  nameOptional,
} from '@/lib/validation';

describe('usernameField (3–30 policy)', () => {
  it('rejects 2 chars (below min)', () => {
    expect(usernameField.safeParse('ab').success).toBe(false);
  });
  it('accepts exactly 3 chars (min boundary)', () => {
    expect(usernameField.safeParse('abc').success).toBe(true);
  });
  it('accepts exactly 30 chars (max boundary)', () => {
    expect(usernameField.safeParse('a'.repeat(30)).success).toBe(true);
  });
  it('rejects 31 chars (above max)', () => {
    expect(usernameField.safeParse('a'.repeat(31)).success).toBe(false);
  });
  it('rejects empty string', () => {
    expect(usernameField.safeParse('').success).toBe(false);
  });
  it('arabic message on min violation', () => {
    const r = usernameField.safeParse('ab');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
  });
  it('arabic message on max violation', () => {
    const r = usernameField.safeParse('a'.repeat(31));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('اسم المستخدم يجب ألا يتجاوز 30 حرفًا');
  });
  it('usernameOptional: undefined passes, short string still fails', () => {
    expect(usernameOptional.safeParse(undefined).success).toBe(true);
    expect(usernameOptional.safeParse('ab').success).toBe(false);
  });
});

describe('usernamePresence (login / legacy accounts)', () => {
  it('accepts 1 char (existing accounts may predate the 3-char policy)', () => {
    expect(usernamePresence.safeParse('x').success).toBe(true);
  });
  it('rejects empty string', () => {
    expect(usernamePresence.safeParse('').success).toBe(false);
  });
});

describe('passwordField (8–100 policy)', () => {
  it('rejects 7 chars (below min)', () => {
    expect(passwordField.safeParse('1234567').success).toBe(false);
  });
  it('accepts exactly 8 chars (min boundary)', () => {
    expect(passwordField.safeParse('12345678').success).toBe(true);
  });
  it('accepts exactly 100 chars (max boundary)', () => {
    expect(passwordField.safeParse('x'.repeat(100)).success).toBe(true);
  });
  it('rejects 101 chars (above max)', () => {
    expect(passwordField.safeParse('x'.repeat(101)).success).toBe(false);
  });
  it('min message is the shared constant text', () => {
    const r = passwordField.safeParse('1234567');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  });
  it('passwordOptional: undefined passes, weak string still fails', () => {
    expect(passwordOptional.safeParse(undefined).success).toBe(true);
    expect(passwordOptional.safeParse('short').success).toBe(false);
  });
});

describe('passwordPresence (login)', () => {
  it('accepts any non-empty password (login only checks presence)', () => {
    expect(passwordPresence.safeParse('x').success).toBe(true);
  });
  it('rejects empty string', () => {
    expect(passwordPresence.safeParse('').success).toBe(false);
  });
});

describe('nameField (1–100 policy)', () => {
  it('rejects empty', () => {
    expect(nameField.safeParse('').success).toBe(false);
  });
  it('accepts exactly 1 char', () => {
    expect(nameField.safeParse('م').success).toBe(true);
  });
  it('accepts exactly 100 chars', () => {
    expect(nameField.safeParse('ن'.repeat(100)).success).toBe(true);
  });
  it('rejects 101 chars', () => {
    expect(nameField.safeParse('ن'.repeat(101)).success).toBe(false);
  });
  it('nameOptional: undefined passes', () => {
    expect(nameOptional.safeParse(undefined).success).toBe(true);
  });
});
