import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, phone } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: full_name?.trim() || '',
          phone: phone?.trim() || '',
        },
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Ensure profile contains full_name & phone
    if (data.user) {
      await supabase
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            full_name: full_name?.trim() || null,
            phone: phone?.trim() || null,
            role: 'patient',
          },
          { onConflict: 'id' }
        )
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user: data.user,
      session: data.session,
    })
  } catch (err: any) {
    console.error('Signup error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error during sign up.' },
      { status: 500 }
    )
  }
}
