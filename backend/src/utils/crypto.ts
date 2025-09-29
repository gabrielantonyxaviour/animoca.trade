import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { env } from '../../config/environment.js';

export interface JwtPayload {
  userId: string;
  email?: string;
  walletAddress?: string;
  iat?: number;
  exp?: number;
}

export class CryptoUtils {
  // JWT token management
  static generateJwtToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }

  static verifyJwtToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Wallet signature verification
  static verifyWalletSignature(
    message: string,
    signature: string,
    expectedAddress: string
  ): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  // Generate wallet login message
  static generateWalletLoginMessage(walletAddress: string, nonce?: string): string {
    const timestamp = Date.now();
    const nonceValue = nonce || Math.random().toString(36).substring(2, 15);

    return `Welcome to AIR Credential Platform!

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet address: ${walletAddress}
Nonce: ${nonceValue}
Timestamp: ${timestamp}

Sign this message to prove you have access to this wallet.`;
  }

  // Hash generation utilities
  static generateCredentialHash(credentialData: any): string {
    const dataString = JSON.stringify(credentialData, Object.keys(credentialData).sort());
    return ethers.keccak256(ethers.toUtf8Bytes(dataString));
  }

  static generateUserNonce(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Address utilities
  static normalizeAddress(address: string): string {
    return ethers.getAddress(address);
  }

  static isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  // Random generation
  static generateRandomBytes(length: number = 32): string {
    return ethers.hexlify(ethers.randomBytes(length));
  }

  static generateApiKey(): string {
    return 'air_' + this.generateRandomBytes(16).slice(2);
  }

  // Hash verification
  static verifyHash(data: any, expectedHash: string): boolean {
    const computedHash = this.generateCredentialHash(data);
    return computedHash === expectedHash;
  }

  // Time-based utilities
  static generateTimestampSignature(timestamp: number, secret: string): string {
    const message = `${timestamp}:${secret}`;
    return ethers.keccak256(ethers.toUtf8Bytes(message));
  }

  static verifyTimestampSignature(
    timestamp: number,
    signature: string,
    secret: string,
    maxAge: number = 300000 // 5 minutes
  ): boolean {
    const now = Date.now();
    if (now - timestamp > maxAge) {
      return false;
    }

    const expectedSignature = this.generateTimestampSignature(timestamp, secret);
    return expectedSignature === signature;
  }
}