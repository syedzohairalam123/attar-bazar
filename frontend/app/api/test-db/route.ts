import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing Supabase credentials' 
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Test basic connection
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      })
    }

    // Check table structure
    let columns = null
    try {
      const res = await supabase.rpc('get_table_columns', { table_name: 'profiles' })
      columns = res.data
    } catch {
      columns = null
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      profiles: profiles,
      hasData: profiles && profiles.length > 0,
      sampleProfile: profiles?.[0] || null
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    })
  }
}