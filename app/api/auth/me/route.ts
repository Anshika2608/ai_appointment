import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ authenticated: false, user: null, profile: null })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({
      authenticated: true,
      user,
      profile: profile || {
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
        phone: user.user_metadata?.phone || '',
        role: 'patient',
      },
    })
  } catch (err: any) {
    console.error('Auth check error:', err)
    return NextResponse.json(
      { authenticated: false, error: err.message },
      { status: 500 }
    )
  }
}
