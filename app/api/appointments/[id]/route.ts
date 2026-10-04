import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

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
    const { status, admin_notes, appointment_datetime, doctor_id, reason, patient_name, patient_phone } = body

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
    if (appointment_datetime) {
      updatePayload.appointment_datetime = appointment_datetime
    }
    if (doctor_id) {
      updatePayload.doctor_id = doctor_id
    }
    if (reason !== undefined) {
      updatePayload.reason = reason
    }
    if (patient_name) {
      updatePayload.patient_name = patient_name.trim()
    }
    if (patient_phone) {
      updatePayload.patient_phone = patient_phone.trim()
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields provided for update' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        id,
        patient_name,
        patient_phone,
        patient_email,
        doctor_id,
        appointment_datetime,
        reason,
        status,
        admin_notes,
        doctors (
          id,
          name,
          specialty,
          consultation_fee
        )
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete appointment: ${error.message}`)
    }

    return NextResponse.json({ success: true, message: 'Appointment deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
