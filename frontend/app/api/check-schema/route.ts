import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing Supabase credentials' 
    })
  }

  // Use service role for admin operations
  const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey)

  try {
    // Check if multi-role columns exist in profiles table
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_buyer, is_seller, is_admin')
      .limit(1)

    if (error) {
      // If error mentions column doesn't exist, we need to add them
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          needsMigration: true,
          message: 'Multi-role columns missing',
          currentError: error.message,
          requiredColumns: ['is_buyer', 'is_seller', 'is_admin']
        })
      }
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        needsMigration: true,
        message: 'No profiles found, but table exists',
        reason: 'Need to ensure schema is correct'
      })
    }

    const profile = profiles[0]
    const hasMultiRoleColumns = 
      'is_buyer' in profile && 
      'is_seller' in profile && 
      'is_admin' in profile

    return NextResponse.json({
      success: true,
      needsMigration: !hasMultiRoleColumns,
      hasMultiRoleColumns,
      sampleProfile: profile,
      currentColumns: Object.keys(profile)
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    })
  }
}