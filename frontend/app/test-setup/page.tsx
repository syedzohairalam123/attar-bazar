'use client'
import { useState, useEffect } from 'react'

export default function TestSetupPage() {
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [schemaStatus, setSchemaStatus] = useState<any>(null)
  const [applyingSchema, setApplyingSchema] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    testDatabaseConnection()
  }, [])

  const testDatabaseConnection = async () => {
    addLog('Testing database connection...')
    try {
      const response = await fetch('/api/test-db')
      const data = await response.json()
      setDbStatus(data)
      addLog(`Database connection: ${data.success ? 'SUCCESS' : 'FAILED'}`)
      if (data.success) {
        addLog(`Profiles found: ${data.hasData ? 'Yes' : 'No'}`)
        if (data.sampleProfile) {
          addLog(`Sample profile columns: ${Object.keys(data.sampleProfile).join(', ')}`)
        }
      } else {
        addLog(`Error: ${data.error}`)
      }
    } catch (err: any) {
      addLog(`Connection test failed: ${err.message}`)
      setDbStatus({ success: false, error: err.message })
    }
  }

  const checkSchema = async () => {
    addLog('Checking schema for multi-role columns...')
    try {
      const response = await fetch('/api/check-schema')
      const data = await response.json()
      setSchemaStatus(data)
      addLog(`Schema check: ${data.success ? 'SUCCESS' : 'FAILED'}`)
      addLog(`Needs migration: ${data.needsMigration ? 'YES' : 'NO'}`)
      if (data.currentColumns) {
        addLog(`Current columns: ${data.currentColumns.join(', ')}`)
      }
    } catch (err: any) {
      addLog(`Schema check failed: ${err.message}`)
    }
  }

  const applySchema = async () => {
    setApplyingSchema(true)
    addLog('Applying schema changes...')
    try {
      const response = await fetch('/api/apply-schema', { method: 'POST' })
      const data = await response.json()
      addLog(`Schema application: ${data.success ? 'SUCCESS' : 'COMPLETED WITH ERRORS'}`)
      if (data.changesMade) {
        data.changesMade.forEach((change: string) => addLog(`  - ${change}`))
      }
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((error: string) => addLog(`  ERROR: ${error}`))
      }
      // Re-check schema after applying
      await checkSchema()
    } catch (err: any) {
      addLog(`Schema application failed: ${err.message}`)
    } finally {
      setApplyingSchema(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Attar Bazaar - Database Setup & Testing</h1>
        
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={`p-6 rounded-lg ${dbStatus?.success ? 'bg-green-900' : 'bg-red-900'}`}>
            <h2 className="text-xl font-semibold mb-2">Database Connection</h2>
            <p className="text-sm">
              Status: {dbStatus?.success ? '✅ Connected' : '❌ Failed'}
            </p>
            {dbStatus?.error && <p className="text-xs mt-2 text-red-300">{dbStatus.error}</p>}
            {dbStatus?.sampleProfile && (
              <div className="mt-3 text-xs">
                <p>Sample Profile:</p>
                <pre className="bg-black/30 p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(dbStatus.sampleProfile, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className={`p-6 rounded-lg ${schemaStatus?.hasMultiRoleColumns ? 'bg-green-900' : 'bg-yellow-900'}`}>
            <h2 className="text-xl font-semibold mb-2">Multi-Role Schema</h2>
            <p className="text-sm">
              Status: {schemaStatus?.hasMultiRoleColumns ? '✅ Ready' : '⚠️ Needs Migration'}
            </p>
            {schemaStatus?.needsMigration && (
              <p className="text-xs mt-2 text-yellow-300">
                Multi-role columns (is_buyer, is_seller, is_admin) are missing
              </p>
            )}
            {schemaStatus?.currentColumns && (
              <div className="mt-3 text-xs">
                <p>Current Columns:</p>
                <p className="bg-black/30 p-2 rounded mt-1">
                  {schemaStatus.currentColumns.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={testDatabaseConnection}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            Test Connection
          </button>
          <button 
            onClick={checkSchema}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
          >
            Check Schema
          </button>
          {schemaStatus?.needsMigration && (
            <button 
              onClick={applySchema}
              disabled={applyingSchema}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50"
            >
              {applyingSchema ? 'Applying...' : 'Apply Schema Changes'}
            </button>
          )}
        </div>

        {/* Logs */}
        <div className="bg-black/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">📋 Activity Logs</h3>
          <div className="font-mono text-sm space-y-1 max-h-96 overflow-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400">No activity yet. Click a button to start.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={log.includes('ERROR') || log.includes('FAILED') ? 'text-red-400' : 'text-green-400'}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 p-6 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">🔗 Quick Testing Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/" className="text-blue-400 hover:underline">Homepage</a>
            <a href="/auth/register" className="text-blue-400 hover:underline">Register</a>
            <a href="/auth/login" className="text-blue-400 hover:underline">Login</a>
            <a href="/seller" className="text-blue-400 hover:underline">Seller Dashboard</a>
            <a href="/admin" className="text-blue-400 hover:underline">Admin Portal</a>
            <a href="/account" className="text-blue-400 hover:underline">My Account</a>
            <a href="/products" className="text-blue-400 hover:underline">Products</a>
            <a href="/cart" className="text-blue-400 hover:underline">Cart</a>
          </div>
        </div>
      </div>
    </div>
  )
}