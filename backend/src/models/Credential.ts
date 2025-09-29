import { query, queryOne } from '../utils/database.js';

export interface ICredential {
  id: string;
  userId: string;
  name: string;
  description?: string;
  credentialHash: string;
  credentialData: any;
  aizkProof: any;
  status: CredentialStatus;
  tokenAddress?: string;
  tokenSymbol?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum CredentialStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  REJECTED = 'rejected',
}

export interface CreateCredentialData {
  userId: string;
  name: string;
  description?: string;
  credentialHash: string;
  credentialData: any;
  aizkProof: any;
}

export interface UpdateCredentialData {
  status?: CredentialStatus;
  tokenAddress?: string;
  tokenSymbol?: string;
}

export class CredentialModel {
  static async create(credentialData: CreateCredentialData): Promise<ICredential> {
    const {
      userId,
      name,
      description,
      credentialHash,
      credentialData: data,
      aizkProof,
    } = credentialData;

    const result = await queryOne<any>(
      `INSERT INTO credentials (
        user_id, name, description, credential_hash,
        credential_data, aizk_proof, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        userId,
        name,
        description,
        credentialHash,
        JSON.stringify(data),
        JSON.stringify(aizkProof),
        CredentialStatus.PENDING,
      ]
    );

    if (!result) {
      throw new Error('Failed to create credential');
    }

    return this.transformDbCredential(result);
  }

  static async findById(id: string): Promise<ICredential | null> {
    const result = await queryOne<any>(
      'SELECT * FROM credentials WHERE id = $1',
      [id]
    );

    return result ? this.transformDbCredential(result) : null;
  }

  static async findByHash(credentialHash: string): Promise<ICredential | null> {
    const result = await queryOne<any>(
      'SELECT * FROM credentials WHERE credential_hash = $1',
      [credentialHash]
    );

    return result ? this.transformDbCredential(result) : null;
  }

  static async findByUserId(userId: string, limit = 20, offset = 0): Promise<ICredential[]> {
    const results = await query<any>(
      'SELECT * FROM credentials WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    return results.map(cred => this.transformDbCredential(cred));
  }

  static async findByTokenAddress(tokenAddress: string): Promise<ICredential | null> {
    const result = await queryOne<any>(
      'SELECT * FROM credentials WHERE token_address = $1',
      [tokenAddress]
    );

    return result ? this.transformDbCredential(result) : null;
  }

  static async update(id: string, updateData: UpdateCredentialData): Promise<ICredential | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
    }

    if (updateData.tokenAddress !== undefined) {
      setClauses.push(`token_address = $${paramIndex++}`);
      values.push(updateData.tokenAddress);
    }

    if (updateData.tokenSymbol !== undefined) {
      setClauses.push(`token_symbol = $${paramIndex++}`);
      values.push(updateData.tokenSymbol);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await queryOne<any>(
      `UPDATE credentials SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result ? this.transformDbCredential(result) : null;
  }

  static async list(limit = 20, offset = 0): Promise<ICredential[]> {
    const results = await query<any>(
      'SELECT * FROM credentials ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return results.map(cred => this.transformDbCredential(cred));
  }

  private static transformDbCredential(dbCredential: any): ICredential {
    return {
      id: dbCredential.id,
      userId: dbCredential.user_id,
      name: dbCredential.name,
      description: dbCredential.description,
      credentialHash: dbCredential.credential_hash,
      credentialData: dbCredential.credential_data ? JSON.parse(dbCredential.credential_data) : {},
      aizkProof: dbCredential.aizk_proof ? JSON.parse(dbCredential.aizk_proof) : {},
      status: dbCredential.status as CredentialStatus,
      tokenAddress: dbCredential.token_address,
      tokenSymbol: dbCredential.token_symbol,
      createdAt: new Date(dbCredential.created_at),
      updatedAt: new Date(dbCredential.updated_at),
    };
  }
}