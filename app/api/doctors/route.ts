import { NextRequest, NextResponse } from 'next/server'
import { getDoctors } from '@/lib/services/appointmentService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const specialty = searchParams.get('specialty') || undefined

    const doctors = await getDoctors(specialty)
    return NextResponse.json({ success: true, count: doctors.length, doctors })
  } catch (error: any) {
    console.error('Error fetching doctors:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
