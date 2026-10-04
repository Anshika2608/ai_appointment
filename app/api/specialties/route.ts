import { NextResponse } from 'next/server'
import { getSpecialties } from '@/lib/services/appointmentService'

export async function GET() {
  try {
    const specialties = await getSpecialties()
    return NextResponse.json({ success: true, specialties })
  } catch (error: any) {
    console.error('Error fetching specialties:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
