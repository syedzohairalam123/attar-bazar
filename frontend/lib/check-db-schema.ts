// Database schema checker - run this to check if migration is needed
import { createClient } from '@/lib/supabase/client'

export async function checkDatabaseSchema() {
  const supabase = createClient()
  
  try {
    // Check if profiles table has multi-role columns
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, is_buyer, is_seller, is_admin, role')
      .limit(1)
    
    if (error) {
      return { 
        success: false, 
        message: 'Error accessing profiles table',
        error: error.message 
      }
    }
    
    if (!profiles || profiles.length === 0) {
      return { 
        success: true, 
        message: 'No profiles found yet, but table exists',
        needsMigration: true,
        reason: 'Need to check schema structure'
      }
    }
    
    const profile = profiles[0]
    const hasMultiRoleColumns = 
      'is_buyer' in profile && 
      'is_seller' in profile && 
      'is_admin' in profile
    
    if (hasMultiRoleColumns) {
      return {
        success: true,
        message: 'Multi-role columns already exist',
        needsMigration: false,
        schema: {
          hasIsBuyer: 'is_buyer' in profile,
          hasIsSeller: 'is_seller' in profile,
          hasIsAdmin: 'is_admin' in profile,
          sampleData: profile
        }
      }
    } else {
      return {
        success: true,
        message: 'Multi-role columns missing - migration needed',
        needsMigration: true,
        reason: 'is_buyer, is_seller, or is_admin columns not found',
        currentColumns: Object.keys(profile)
      }
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Exception during schema check',
      error: err.message
    }
  }
}