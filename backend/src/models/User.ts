import { query, queryOne } from '../utils/database.js';

export interface IUser {
  id: string;
  walletAddress: string;
  reputationScore: number;
  totalTokensGenerated: string; // BigInt as string
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  walletAddress: string;
}

export interface UpdateUserData {
  reputationScore?: number;
}

export class UserModel {
  static async create(userData: CreateUserData): Promise<IUser> {
    const { walletAddress } = userData;

    // Check if user already exists
    const existingUser = await UserModel.findByWalletAddress(walletAddress);
    if (existingUser) {
      return existingUser; // Return existing user instead of throwing error
    }

    const result = await queryOne<any>(
      `INSERT INTO users (wallet_address, reputation_score, total_tokens_generated)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [walletAddress.toLowerCase(), 0, '0']
    );

    if (!result) {
      throw new Error('Failed to create user');
    }

    return this.transformDbUser(result);
  }

  static async findById(id: string): Promise<IUser | null> {
    const result = await queryOne<any>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result ? this.transformDbUser(result) : null;
  }

  static async findByWalletAddress(walletAddress: string): Promise<IUser | null> {
    const result = await queryOne<any>(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress.toLowerCase()]
    );

    return result ? this.transformDbUser(result) : null;
  }

  static async update(id: string, updateData: UpdateUserData): Promise<IUser | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.reputationScore !== undefined) {
      setClauses.push(`reputation_score = $${paramIndex++}`);
      values.push(updateData.reputationScore);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await queryOne<any>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result ? this.transformDbUser(result) : null;
  }

  static async updateTokensGenerated(id: string, amount: string): Promise<void> {
    await query(
      'UPDATE users SET total_tokens_generated = (total_tokens_generated::bigint + $1::bigint)::text WHERE id = $2',
      [amount, id]
    );
  }

  static async list(limit = 20, offset = 0): Promise<IUser[]> {
    const results = await query<any>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return results.map(user => this.transformDbUser(user));
  }

  private static transformDbUser(dbUser: any): IUser {
    return {
      id: dbUser.id,
      walletAddress: dbUser.wallet_address,
      reputationScore: dbUser.reputation_score,
      totalTokensGenerated: dbUser.total_tokens_generated,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
    };
  }
}