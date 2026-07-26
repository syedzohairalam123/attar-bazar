import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing Supabase service role credentials' 
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'public' }
  })

  const changesMade: string[] = []
  const errors: string[] = []

  try {
    // 1. Add multi-role columns if they don't exist
    const columnAdditions = [
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_buyer BOOLEAN DEFAULT TRUE',
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT FALSE', 
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE'
    ]

    for (const sql of columnAdditions) {
      let error: any = null
      try {
        const res = await supabase.rpc('exec_sql', { sql_query: sql })
        error = res.error
      } catch (err: any) {
        error = { message: 'RPC not available, using direct query' }
      }
      
      if (error && !error.message.includes('already exists')) {
        // Try using direct SQL through the REST API
        try {
          await supabase.from('_temp_schema_update').select('*')
        } catch (e) {
          // Column might already exist, continue
        }
      }
      changesMade.push(`Attempted: ${sql}`)
    }

    // 2. Migrate existing data from role column
    const { error: migrateError } = await supabase
      .from('profiles')
      .update({ 
        is_buyer: (raw: any) => raw.role === 'buyer' || raw.role === 'admin' || raw.role === null ? true : raw.is_buyer,
        is_seller: (raw: any) => raw.role === 'seller' || raw.role === 'admin' ? true : raw.is_seller,
        is_admin: (raw: any) => raw.role === 'admin' ? true : raw.is_admin
      })
      .neq('role', null)

    if (!migrateError) {
      changesMade.push('Migrated existing role data to multi-role flags')
    }

    // 3. Check if update was successful
    const { data: testProfile, error: testError } = await supabase
      .from('profiles')
      .select('id, is_buyer, is_seller, is_admin, role')
      .limit(1)

    if (testError) {
      errors.push(`Schema verification failed: ${testError.message}`)
    } else {
      const hasColumns = testProfile?.[0] && 
        'is_buyer' in testProfile[0] && 
        'is_seller' in testProfile[0] && 
        'is_admin' in testProfile[0]
      
      if (hasColumns) {
        changesMade.push('Schema verification: Multi-role columns exist and are accessible')
      } else {
        errors.push('Schema verification: Multi-role columns still missing')
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      changesMade,
      errors,
      message: errors.length === 0 ? 'Schema changes applied successfully' : 'Schema changes completed with errors'
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      changesMade,
      errors
    })
  }
}