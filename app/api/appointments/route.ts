import { NextRequest, NextResponse } from 'next/server'
import { bookAppointment } from '@/lib/services/appointmentService'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const doctorId = searchParams.get('doctor_id')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const supabase = createAdminClient()
    let query = supabase
      .from('appointments')
      .select(`
        id,
        patient_name,
        patient_phone,
        patient_email,
        user_id,
        doctor_id,
        appointment_datetime,
        reason,
        status,
        admin_notes,
        created_at,
        doctors (
          id,
          name,
          specialty,
          consultation_fee
        )
      `)
      .order('appointment_datetime', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }
    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to query appointments: ${error.message}`)
    }

    return NextResponse.json({ success: true, count: data?.length || 0, appointments: data })
  } catch (error: any) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patient_name, patient_phone, patient_email, doctor_id, slot_time, reason, user_id } = body

    const result = await bookAppointment({
      patient_name,
      patient_phone,
      patient_email,
      doctor_id,
      slot_time,
      reason,
      user_id,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Error booking appointment:', error)
    const isConflict = error.message?.includes('already been booked')
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: isConflict ? 409 : 400 }
    )
  }
}
