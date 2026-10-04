import { NextRequest, NextResponse } from 'next/server'
import { checkDoctorAvailability } from '@/lib/services/appointmentService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctor_id')
    const date = searchParams.get('date')

    if (!doctorId || !date) {
      return NextResponse.json(
        { success: false, error: 'Both doctor_id and date (YYYY-MM-DD) query parameters are required.' },
        { status: 400 }
      )
    }

    // Basic date validation YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Date must be in format YYYY-MM-DD (e.g. 2026-10-05).' },
        { status: 400 }
      )
    }

    const availability = await checkDoctorAvailability(doctorId, date)
    return NextResponse.json({ success: true, ...availability })
  } catch (error: any) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
