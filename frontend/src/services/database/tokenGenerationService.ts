import { supabase, TABLES } from '../../config/supabase'
import type { TokenGeneration, CreateTokenGenerationData, UpdateTokenGenerationData, TokenGenerationStatus } from '../../types/database'

export class TokenGenerationService {
  static async createTokenGeneration(data: CreateTokenGenerationData): Promise<TokenGeneration> {
    const { data: result, error } = await supabase
      .from(TABLES.TOKEN_GENERATIONS)
      .insert({
        user_id: data.user_id,
        credential_id: data.credential_id,
        token_address: data.token_address,
        amount: data.amount,
        transaction_hash: data.transaction_hash,
        block_number: data.block_number,
        status: 'completed' as TokenGenerationStatus
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create token generation: ${error.message}`)
    }

    return result
  }

  static async findById(id: string): Promise<TokenGeneration | null> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_GENERATIONS)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to find token generation: ${error.message}`)
    }

    return data
  }

  static async findByTransactionHash(transactionHash: string): Promise<TokenGeneration | null> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_GENERATIONS)
      .select('*')
      .eq('transaction_hash', transactionHash)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to find token generation: ${error.message}`)
    }

    return data
  }

  static async findByUserId(userId: string, limit = 20, offset = 0): Promise<TokenGeneration[]> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_GENERATIONS)
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to find token generations: ${error.message}`)
    }

    return data || []
  }

  static async findByCredentialId(credentialId: string): Promise<TokenGeneration[]> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_GENERATIONS)
      .select('*')
      .eq('credential_id', credentialId)
      .order('generated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to find token generations: ${error.message}`)
    }

    return data || []
  }

  static async updateTokenGeneration(id: string, updateData: UpdateTokenGenerationData): Promise<TokenGeneration> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_GENERATIONS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update token generation: ${error.message}`)
    }

    return data
  }

  static async listTokenGenerations(limit = 20, offset = 0): Promise<TokenGeneration[]> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_GENERATIONS)
      .select('*')
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to list token generations: ${error.message}`)
    }

    return data || []
  }

  static async getTotalByToken(tokenAddress: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('get_total_tokens_by_address', {
        token_addr: tokenAddress,
        generation_status: 'completed'
      })

    if (error) {
      // Fallback to manual sum if RPC function doesn't exist
      const { data: generations, error: genError } = await supabase
        .from(TABLES.TOKEN_GENERATIONS)
        .select('amount')
        .eq('token_address', tokenAddress)
        .eq('status', 'completed')

      if (genError) {
        throw new Error(`Failed to get total tokens: ${genError.message}`)
      }

      // Sum manually
      const total = generations?.reduce((sum, gen) => {
        return sum + BigInt(gen.amount)
      }, BigInt(0)) || BigInt(0)

      return total.toString()
    }

    return data || '0'
  }

  static async getTokenGenerationsByStatus(status: TokenGenerationStatus, limit = 20, offset = 0): Promise<TokenGeneration[]> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_GENERATIONS)
      .select('*')
      .eq('status', status)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get token generations by status: ${error.message}`)
    }

    return data || []
  }

  static async getTokenGenerationsByTokenAddress(tokenAddress: string, limit = 20, offset = 0): Promise<TokenGeneration[]> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_GENERATIONS)
      .select('*')
      .eq('token_address', tokenAddress)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get token generations by token address: ${error.message}`)
    }

    return data || []
  }
}