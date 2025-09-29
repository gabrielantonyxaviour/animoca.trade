import { supabase, TABLES } from '../../config/supabase'
import type { Credential, CreateCredentialData, UpdateCredentialData, CredentialStatus } from '../../types/database'

export class CredentialService {
  static async createCredential(credentialData: CreateCredentialData): Promise<Credential> {
    const { data, error } = await supabase
      .from(TABLES.CREDENTIALS)
      .insert({
        user_id: credentialData.user_id,
        name: credentialData.name,
        description: credentialData.description,
        credential_hash: credentialData.credential_hash,
        credential_data: credentialData.credential_data,
        aizk_proof: credentialData.aizk_proof,
        status: 'pending' as CredentialStatus
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create credential: ${error.message}`)
    }

    return data
  }

  static async findById(id: string): Promise<Credential | null> {
    const { data, error } = await supabase
      .from(TABLES.CREDENTIALS)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to find credential: ${error.message}`)
    }

    return data
  }

  static async findByHash(credentialHash: string): Promise<Credential | null> {
    const { data, error } = await supabase
      .from(TABLES.CREDENTIALS)
      .select('*')
      .eq('credential_hash', credentialHash)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to find credential: ${error.message}`)
    }

    return data
  }

  static async findByUserId(userId: string, limit = 20, offset = 0): Promise<Credential[]> {
    const { data, error } = await supabase
      .from(TABLES.CREDENTIALS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to find credentials: ${error.message}`)
    }

    return data || []
  }

  static async findByTokenAddress(tokenAddress: string): Promise<Credential | null> {
    const { data, error } = await supabase
      .from(TABLES.CREDENTIALS)
      .select('*')
      .eq('token_address', tokenAddress)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to find credential: ${error.message}`)
    }

    return data
  }

  static async updateCredential(id: string, updateData: UpdateCredentialData): Promise<Credential> {
    const { data, error } = await supabase
      .from(TABLES.CREDENTIALS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update credential: ${error.message}`)
    }

    return data
  }

  static async listCredentials(limit = 20, offset = 0): Promise<Credential[]> {
    const { data, error } = await supabase
      .from(TABLES.CREDENTIALS)
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to list credentials: ${error.message}`)
    }

    return data || []
  }

  static async getCredentialsByStatus(status: CredentialStatus, limit = 20, offset = 0): Promise<Credential[]> {
    const { data, error } = await supabase
      .from(TABLES.CREDENTIALS)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get credentials by status: ${error.message}`)
    }

    return data || []
  }

  static async searchCredentials(searchTerm: string, limit = 20, offset = 0): Promise<Credential[]> {
    const { data, error } = await supabase
      .from(TABLES.CREDENTIALS)
      .select('*')
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to search credentials: ${error.message}`)
    }

    return data || []
  }
}