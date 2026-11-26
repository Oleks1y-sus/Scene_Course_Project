import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Algorithm, hash, verify } from '@node-rs/argon2';
import { env } from '../env.js';

const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const hashPassword = async (password: string): Promise<string> => {
  return hash(password, ARGON_OPTIONS);
};

export const verifyPassword = async (passwordHash: string, password: string): Promise<boolean> => {
  try {
    return await verify(passwordHash, password, ARGON_OPTIONS);
  } catch {
    return false;
  }
};

export const hmacHex = (value: string, pepper: string): string => {
  return createHmac('sha256', pepper).update(value, 'utf8').digest('hex');
};

export const hashSessionToken = (token: string): string => hmacHex(token, env.SESSION_PEPPER);

export const hashOtp = (email: string, purpose: string, code: string): string => {
  return hmacHex(`${email}:${purpose}:${code}`, env.OTP_PEPPER);
};

export const hashIp = (ip: string | undefined): string | null => {
  if (!ip) return null;
  return hmacHex(ip, env.IP_PEPPER);
};

export const generateSessionToken = (): string => randomBytes(32).toString('base64url');

export const generateOtp = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

export const generateTemporaryPassword = (): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i += 1) {
    password += alphabet[randomInt(0, alphabet.length)];
  }
  return password;
};

export const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};
