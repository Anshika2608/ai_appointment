import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    })
  } catch (err: any) {
    console.error('Logout error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error during logout.' },
      { status: 500 }
    )
  }
}
