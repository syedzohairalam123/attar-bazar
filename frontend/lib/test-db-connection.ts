// Quick database connection test
import { createClient } from '@/lib/supabase/client'

export async function testDatabaseConnection() {
  const supabase = createClient()
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('id, is_buyer, is_seller, is_admin').limit(1)
    
    if (error) {
      console.error('Database connection error:', error)
      return { success: false, error: error.message }
    }
    
    // Check if multi-role columns exist
    const firstProfile = data?.[0]
    const hasMultiRoleColumns = firstProfile && 
      'is_buyer' in firstProfile && 
      'is_seller' in firstProfile && 
      'is_admin' in firstProfile
    
    return { 
      success: true, 
      hasMultiRoleColumns,
      sampleData: firstProfile 
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}