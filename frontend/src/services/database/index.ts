// Database services for direct Supabase integration
export { UserService } from './userService'
export { CredentialService } from './credentialService'
export { TokenGenerationService } from './tokenGenerationService'

// Re-export types for convenience
export type {
  User,
  CreateUserData,
  UpdateUserData,
  Credential,
  CreateCredentialData,
  UpdateCredentialData,
  CredentialStatus,
  TokenGeneration,
  CreateTokenGenerationData,
  UpdateTokenGenerationData,
  TokenGenerationStatus
} from '../../types/database'

// Re-export Supabase client if needed
export { supabase } from '../../config/supabase'