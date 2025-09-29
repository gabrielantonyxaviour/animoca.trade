import { query, queryOne } from '../utils/database.js';

export interface ITokenGeneration {
  id: string;
  userId: string;
  credentialId: string;
  tokenAddress: string;
  amount: string; // BigInt as string
  transactionHash: string;
  status: TokenGenerationStatus;
  generatedAt: Date;
  blockNumber: number;
}

export enum TokenGenerationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface CreateTokenGenerationData {
  userId: string;
  credentialId: string;
  tokenAddress: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
}

export interface UpdateTokenGenerationData {
  status?: TokenGenerationStatus;
  transactionHash?: string;
  blockNumber?: number;
}

export class TokenGenerationModel {
  static async create(data: CreateTokenGenerationData): Promise<ITokenGeneration> {
    const {
      userId,
      credentialId,
      tokenAddress,
      amount,
      transactionHash,
      blockNumber,
    } = data;

    const result = await queryOne<any>(
      `INSERT INTO token_generations (
        user_id, credential_id, token_address, amount,
        transaction_hash, block_number, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        userId,
        credentialId,
        tokenAddress,
        amount,
        transactionHash,
        blockNumber,
        TokenGenerationStatus.COMPLETED,
      ]
    );

    if (!result) {
      throw new Error('Failed to create token generation record');
    }

    return this.transformDbTokenGeneration(result);
  }

  static async findById(id: string): Promise<ITokenGeneration | null> {
    const result = await queryOne<any>(
      'SELECT * FROM token_generations WHERE id = $1',
      [id]
    );

    return result ? this.transformDbTokenGeneration(result) : null;
  }

  static async findByTransactionHash(transactionHash: string): Promise<ITokenGeneration | null> {
    const result = await queryOne<any>(
      'SELECT * FROM token_generations WHERE transaction_hash = $1',
      [transactionHash]
    );

    return result ? this.transformDbTokenGeneration(result) : null;
  }

  static async findByUserId(userId: string, limit = 20, offset = 0): Promise<ITokenGeneration[]> {
    const results = await query<any>(
      'SELECT * FROM token_generations WHERE user_id = $1 ORDER BY generated_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    return results.map(gen => this.transformDbTokenGeneration(gen));
  }

  static async findByCredentialId(credentialId: string): Promise<ITokenGeneration[]> {
    const results = await query<any>(
      'SELECT * FROM token_generations WHERE credential_id = $1 ORDER BY generated_at DESC',
      [credentialId]
    );

    return results.map(gen => this.transformDbTokenGeneration(gen));
  }

  static async update(
    id: string,
    updateData: UpdateTokenGenerationData
  ): Promise<ITokenGeneration | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
    }

    if (updateData.transactionHash !== undefined) {
      setClauses.push(`transaction_hash = $${paramIndex++}`);
      values.push(updateData.transactionHash);
    }

    if (updateData.blockNumber !== undefined) {
      setClauses.push(`block_number = $${paramIndex++}`);
      values.push(updateData.blockNumber);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await queryOne<any>(
      `UPDATE token_generations SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result ? this.transformDbTokenGeneration(result) : null;
  }

  static async list(limit = 20, offset = 0): Promise<ITokenGeneration[]> {
    const results = await query<any>(
      'SELECT * FROM token_generations ORDER BY generated_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return results.map(gen => this.transformDbTokenGeneration(gen));
  }

  static async getTotalByToken(tokenAddress: string): Promise<string> {
    const result = await queryOne<any>(
      'SELECT COALESCE(SUM(amount::numeric), 0) as total FROM token_generations WHERE token_address = $1 AND status = $2',
      [tokenAddress, TokenGenerationStatus.COMPLETED]
    );

    return result?.total?.toString() || '0';
  }

  private static transformDbTokenGeneration(dbGeneration: any): ITokenGeneration {
    return {
      id: dbGeneration.id,
      userId: dbGeneration.user_id,
      credentialId: dbGeneration.credential_id,
      tokenAddress: dbGeneration.token_address,
      amount: dbGeneration.amount,
      transactionHash: dbGeneration.transaction_hash,
      status: dbGeneration.status as TokenGenerationStatus,
      generatedAt: new Date(dbGeneration.generated_at),
      blockNumber: dbGeneration.block_number,
    };
  }
}