import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, appointment: data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, admin_notes } = body

    const updatePayload: Record<string, any> = {}
    if (status) {
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updatePayload.status = status
    }

    if (admin_notes !== undefined) {
      updatePayload.admin_notes = admin_notes
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields provided for update (status or admin_notes)' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        id,
        patient_name,
        patient_phone,
        doctor_id,
        appointment_datetime,
        reason,
        status,
        admin_notes
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update appointment: ${error.message}`)
    }

    return NextResponse.json({ success: true, appointment: data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
