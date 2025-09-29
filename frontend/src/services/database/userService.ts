import { supabase, TABLES } from '../../config/supabase'
import type { User, CreateUserData, UpdateUserData } from '../../types/database'

export class UserService {
  static async createUser(userData: CreateUserData): Promise<User> {
    // Check if user already exists
    const existing = await this.findByWalletAddress(userData.wallet_address)
    if (existing) {
      return existing // Return existing user instead of throwing error
    }

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .insert({
        wallet_address: userData.wallet_address.toLowerCase(),
        reputation_score: 0,
        total_tokens_generated: '0'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`)
    }

    return data
  }

  static async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to find user: ${error.message}`)
    }

    return data
  }

  static async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to find user: ${error.message}`)
    }

    return data
  }

  static async updateUser(id: string, updateData: UpdateUserData): Promise<User> {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`)
    }

    return data
  }

  static async updateTokensGenerated(id: string, amount: string): Promise<void> {
    // First get current amount
    const user = await this.findById(id)
    if (!user) throw new Error('User not found')

    const currentAmount = BigInt(user.total_tokens_generated)
    const newAmount = currentAmount + BigInt(amount)

    await this.updateUser(id, {
      ...user,
      total_tokens_generated: newAmount.toString()
    } as UpdateUserData)
  }

  static async listUsers(limit = 20, offset = 0): Promise<User[]> {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`)
    }

    return data || []
  }
}