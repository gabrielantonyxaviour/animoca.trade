import React, { useState } from 'react'
import { UserService, CredentialService, TokenGenerationService } from '../services/database'
import type { User, Credential, TokenGeneration } from '../services/database'

export const DatabaseTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready to test')
  const [testResults, setTestResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testDatabase = async () => {
    setLoading(true)
    setStatus('Testing database connection...')
    const results: any = {}

    try {
      // Test 1: Create a test user
      setStatus('Creating test user...')
      const testWallet = '0x1234567890123456789012345678901234567890'
      const user = await UserService.createUser({ wallet_address: testWallet })
      results.user = user
      setStatus('✅ User created successfully')

      // Test 2: Create a test credential
      setStatus('Creating test credential...')
      const credential = await CredentialService.createCredential({
        user_id: user.id,
        name: 'Test Credential',
        description: 'A test credential for database testing',
        credential_hash: '0xtest123456789abcdef',
        credential_data: { type: 'test', value: 'demo' },
        aizk_proof: { proof: 'test_proof_data' }
      })
      results.credential = credential
      setStatus('✅ Credential created successfully')

      // Test 3: Create a test token generation
      setStatus('Creating test token generation...')
      const tokenGeneration = await TokenGenerationService.createTokenGeneration({
        user_id: user.id,
        credential_id: credential.id,
        token_address: '0xabcdef1234567890',
        amount: '1000',
        transaction_hash: '0xtesthash123456789',
        block_number: 12345
      })
      results.tokenGeneration = tokenGeneration
      setStatus('✅ Token generation created successfully')

      // Test 4: Query data back
      setStatus('Querying data...')
      const userData = await UserService.findByWalletAddress(testWallet)
      const userCredentials = await CredentialService.findByUserId(user.id)
      const userTokenGenerations = await TokenGenerationService.findByUserId(user.id)

      results.queries = {
        user: userData,
        credentials: userCredentials,
        tokenGenerations: userTokenGenerations
      }

      setStatus('✅ All database tests passed!')
      setTestResults(results)

    } catch (error: any) {
      setStatus(`❌ Test failed: ${error.message}`)
      console.error('Database test error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Database Connection Test</h2>

      <div className="mb-4">
        <button
          onClick={testDatabase}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Database Connection'}
        </button>
      </div>

      <div className="mb-4">
        <p className="text-lg font-medium">Status: {status}</p>
      </div>

      {Object.keys(testResults).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-2">Test Results:</h3>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            <pre className="text-sm">{JSON.stringify(testResults, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-bold">This test will:</h4>
        <ul className="list-disc list-inside">
          <li>Create a test user with a wallet address</li>
          <li>Create a test credential for that user</li>
          <li>Create a test token generation record</li>
          <li>Query the data back to verify everything works</li>
        </ul>
      </div>
    </div>
  )
}