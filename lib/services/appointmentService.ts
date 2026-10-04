import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface ShiftSlots {
  shift_name: string
  start_time: string
  end_time: string
  slots: string[]
}

export interface AvailabilityResult {
  doctor_id: string
  doctor_name: string
  specialty: string
  consultation_fee: number
  date: string
  day_of_week: number
  is_working_day: boolean
  shifts: ShiftSlots[]
  available_slots: string[]
  message?: string
}

export interface BookingInput {
  patient_name: string
  patient_phone?: string
  patient_email?: string
  doctor_id: string // Can be UUID or Doctor Name
  slot_time: string // ISO string, "YYYY-MM-DD HH:mm", or date string
  reason?: string
  user_id?: string | null
}

/**
 * Robust doctor lookup by either UUID or name
 */
export async function findDoctor(idOrName: string) {
  if (!idOrName || !idOrName.trim()) return null
  const supabase = createAdminClient()
  const trimmed = idOrName.trim()

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
  if (isUUID) {
    const { data } = await supabase.from('doctors').select('*').eq('id', trimmed).maybeSingle()
    if (data) return data
  }

  // Fallback: search by doctor name (e.g. "Dr. Anita Joshi", "Dr. Arjun Mehta (Cardiologist)")
  const cleanName = trimmed
    .replace(/^Dr\.?\s*/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/—.*$/, '')
    .replace(/-.*$/, '')
    .trim()

  let { data } = await supabase
    .from('doctors')
    .select('*')
    .ilike('name', `%${cleanName}%`)
    .limit(1)
    .maybeSingle()

  // If still not found, try matching first name
  if (!data && cleanName.split(' ')[0]) {
    const firstName = cleanName.split(' ')[0]
    const res = await supabase
      .from('doctors')
      .select('*')
      .ilike('name', `%${firstName}%`)
      .limit(1)
      .maybeSingle()
    data = res.data
  }

  return data
}

/**
 * Robust ISO datetime extractor
 */
function parseSlotDatetime(slotTimeStr: string, fallbackDate?: string): string {
  if (!slotTimeStr || !slotTimeStr.trim()) {
    throw new Error('Appointment time is missing.')
  }

  // Check if it already has YYYY-MM-DD
  const dateMatch = slotTimeStr.match(/(\d{4}-\d{2}-\d{2})/)
  const timeMatch = slotTimeStr.match(/(\d{1,2}:\d{2})/)

  let datePart = dateMatch ? dateMatch[1] : fallbackDate
  let timePart = timeMatch ? timeMatch[1] : null

  if (!datePart) {
    // If no date found in string, try today or fallback
    const now = new Date()
    datePart = now.toISOString().slice(0, 10)
  }

  if (!timePart) {
    // Check if standard Date constructor can parse it
    const directDate = new Date(slotTimeStr)
    if (!isNaN(directDate.getTime())) {
      return directDate.toISOString()
    }
    throw new Error(`Could not determine time from "${slotTimeStr}". Please specify time (e.g. 16:00).`)
  }

  // Ensure HH is 2-digit (e.g. 9:00 -> 09:00)
  const [h, m] = timePart.split(':')
  const formattedTime = `${h.padStart(2, '0')}:${m}:00`

  const iso = `${datePart}T${formattedTime}Z`
  const finalDate = new Date(iso)
  if (isNaN(finalDate.getTime())) {
    throw new Error(`Invalid slot datetime format: ${slotTimeStr}`)
  }

  return finalDate.toISOString()
}

/**
 * Fetch all available medical specialties
 */
export async function getSpecialties() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('doctors')
    .select('specialty')
    .eq('is_active', true)

  if (error) throw new Error(`Failed to fetch specialties: ${error.message}`)

  const specialties = Array.from(new Set(data.map((d) => d.specialty))).filter(Boolean)
  return specialties
}

/**
 * Fetch doctors, optionally filtered by specialty
 */
export async function getDoctors(specialty?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('doctors')
    .select('id, name, specialty, qualification, experience_years, bio, consultation_fee, avatar_url, is_active')
    .eq('is_active', true)
    .order('name')

  if (specialty && specialty.trim()) {
    query = query.ilike('specialty', `%${specialty.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch doctors: ${error.message}`)
  return data || []
}

/**
 * Helper to generate time slot strings (e.g. ["09:00", "09:30", "10:00"])
 */
function generateTimeSlots(startTime: string, endTime: string, stepMinutes: number = 30): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  let currentTotalMin = startH * 60 + startM
  const endTotalMin = endH * 60 + endM

  // If start_time equals end_time (single slot in schedule), return it directly
  if (currentTotalMin === endTotalMin) {
    const hours = Math.floor(currentTotalMin / 60)
    const mins = currentTotalMin % 60
    return [`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`]
  }

  // Include all slots starting from startTime up to and including endTime
  while (currentTotalMin <= endTotalMin) {
    const hours = Math.floor(currentTotalMin / 60)
    const mins = currentTotalMin % 60
    const formatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    slots.push(formatted)
    currentTotalMin += (stepMinutes || 30)
  }

  return slots
}

/**
 * Check availability for a specific doctor on a given date (YYYY-MM-DD)
 */
export async function checkDoctorAvailability(doctorIdOrName: string, dateStr: string): Promise<AvailabilityResult> {
  const doctor = await findDoctor(doctorIdOrName)
  if (!doctor) {
    throw new Error(`Doctor not found with identifier: "${doctorIdOrName}"`)
  }

  const doctorId = doctor.id

  // Clean date string to YYYY-MM-DD
  const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/)
  const cleanDateStr = dateMatch ? dateMatch[1] : dateStr

  const [year, month, day] = cleanDateStr.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error(`Invalid date format. Expected YYYY-MM-DD, received: ${dateStr}`)
  }

  // Safe UTC date calculation to prevent local timezone day displacement
  const dateObj = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = dateObj.getUTCDay()

  const supabase = createAdminClient()
  let { data: schedules, error: schedError } = await supabase
    .from('doctor_schedules')
    .select('id, shift_name, start_time, end_time, slot_duration_minutes')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', dayOfWeek)
    .order('start_time', { ascending: true })

  if (schedError) {
    throw new Error(`Failed to query schedule: ${schedError.message}`)
  }

  // Fallback: If no schedule exists for this specific day_of_week, check if doctor has schedules on other days or general clinic shifts
  if (!schedules || schedules.length === 0) {
    const { data: generalSchedules } = await supabase
      .from('doctor_schedules')
      .select('id, shift_name, start_time, end_time, slot_duration_minutes')
      .eq('doctor_id', doctorId)
      .order('start_time', { ascending: true })

    if (generalSchedules && generalSchedules.length > 0) {
      const seen = new Set<string>()
      schedules = generalSchedules.filter((s) => {
        if (seen.has(s.start_time)) return false
        seen.add(s.start_time)
        return true
      })
    } else {
      // Default standard clinic shifts for active doctor (Morning 09:00-13:00, Evening 16:00-20:00)
      schedules = [
        { id: 'def-1', shift_name: 'Morning', start_time: '09:00', end_time: '13:00', slot_duration_minutes: 30 },
        { id: 'def-2', shift_name: 'Evening', start_time: '16:00', end_time: '20:00', slot_duration_minutes: 30 },
      ]
    }
  }

  // Existing booked appointments (using admin client so all patient bookings across database are considered)
  const startOfDay = `${cleanDateStr}T00:00:00.000Z`
  const endOfDay = `${cleanDateStr}T23:59:59.999Z`

  const { data: bookedAppointments, error: apptError } = await supabase
    .from('appointments')
    .select('appointment_datetime, status')
    .eq('doctor_id', doctorId)
    .gte('appointment_datetime', startOfDay)
    .lte('appointment_datetime', endOfDay)
    .neq('status', 'cancelled')

  if (apptError) {
    throw new Error(`Failed to check existing bookings: ${apptError.message}`)
  }

  const bookedTimes = new Set<string>()
  for (const appt of bookedAppointments || []) {
    // 1. Direct regex extraction from ISO string (e.g. "2026-10-05T16:00:00Z" -> "16:00")
    const match = appt.appointment_datetime.match(/[T\s](\d{2}):(\d{2})/)
    if (match) {
      bookedTimes.add(`${match[1]}:${match[2]}`)
    }
    // 2. Also UTC extraction as fallback
    const d = new Date(appt.appointment_datetime)
    if (!isNaN(d.getTime())) {
      const h = String(d.getUTCHours()).padStart(2, '0')
      const m = String(d.getUTCMinutes()).padStart(2, '0')
      bookedTimes.add(`${h}:${m}`)
    }
  }

  const shifts: ShiftSlots[] = []
  const allAvailableSlots: string[] = []

  const now = new Date()
  const isToday =
    now.getFullYear() === year &&
    now.getMonth() === month - 1 &&
    now.getDate() === day
  const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  for (const sched of schedules) {
    const rawSlots = generateTimeSlots(sched.start_time, sched.end_time, sched.slot_duration_minutes || 30)

    const available = rawSlots.filter((timeSlot) => {
      if (bookedTimes.has(timeSlot)) return false
      if (isToday && timeSlot <= currentHourMin) return false
      return true
    })

    shifts.push({
      shift_name: sched.shift_name || 'General',
      start_time: sched.start_time.slice(0, 5),
      end_time: sched.end_time.slice(0, 5),
      slots: available,
    })

    allAvailableSlots.push(...available)
  }

  return {
    doctor_id: doctor.id,
    doctor_name: doctor.name,
    specialty: doctor.specialty,
    consultation_fee: doctor.consultation_fee,
    date: cleanDateStr,
    day_of_week: dayOfWeek,
    is_working_day: true,
    shifts,
    available_slots: allAvailableSlots,
    message: allAvailableSlots.length === 0 ? 'No slots remaining for this date.' : undefined,
  }
}

/**
 * Book an appointment with robust validation, doctor lookup, and collision check
 */
export async function bookAppointment(input: BookingInput) {
  const supabase = createAdminClient()

  if (!input.patient_name?.trim()) throw new Error('Patient name is required.')
  if (!input.doctor_id) throw new Error('Doctor identifier is required.')
  if (!input.slot_time) throw new Error('Appointment slot time is required.')

  // 1. Resolve doctor by UUID or Name
  const doctor = await findDoctor(input.doctor_id)
  if (!doctor) {
    throw new Error(`Doctor not found with identifier: "${input.doctor_id}".`)
  }

  // 2. Parse slot_time into valid ISO string
  const isoDatetime = parseSlotDatetime(input.slot_time)

  // 3. Collision check — is this doctor already booked at this exact time?
  const { data: existingBooking, error: checkError } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctor.id)
    .eq('appointment_datetime', isoDatetime)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (checkError) {
    throw new Error(`Failed to check slot availability: ${checkError.message}`)
  }

  if (existingBooking) {
    throw new Error('This time slot is already booked. Please choose a different slot.')
  }

  // 4. Insert appointment
  const { data: newAppointment, error: insertError } = await supabase
    .from('appointments')
    .insert({
      patient_name: input.patient_name.trim(),
      patient_phone: (input.patient_phone || '').trim() || 'Not provided',
      patient_email: input.patient_email?.trim() || null,
      doctor_id: doctor.id,
      user_id: input.user_id || null,
      appointment_datetime: isoDatetime,
      reason: input.reason?.trim() || 'General Consultation',
      status: 'confirmed',
    })
    .select('id, patient_name, patient_phone, patient_email, appointment_datetime, reason, status, created_at')
    .single()

  if (insertError || !newAppointment) {
    throw new Error(`Database error saving appointment: ${insertError?.message || 'Unknown error'}`)
  }

  return {
    success: true,
    appointment: {
      ...newAppointment,
      doctor_name: doctor.name,
      specialty: doctor.specialty,
      consultation_fee: doctor.consultation_fee,
    },
  }
}

/**
 * Reschedule an existing appointment
 */
export async function rescheduleAppointment(params: {
  appointment_id?: string
  patient_name?: string
  new_slot_time: string
}) {
  const supabase = await createClient()

  let appt: any = null

  if (params.appointment_id) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.appointment_id.trim())
    if (isUUID) {
      const { data } = await supabase
        .from('appointments')
        .select('*, doctors(*)')
        .eq('id', params.appointment_id.trim())
        .maybeSingle()
      appt = data
    }
  }

  if (!appt && params.patient_name) {
    // Find latest active appointment for this patient
    const { data } = await supabase
      .from('appointments')
      .select('*, doctors(*)')
      .ilike('patient_name', `%${params.patient_name.trim()}%`)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    appt = data
  }

  if (!appt) {
    throw new Error(`Could not find an active appointment for "${params.patient_name || params.appointment_id}".`)
  }

  const newIsoDatetime = parseSlotDatetime(params.new_slot_time)

  // Check collision for new slot
  const { data: existingBooking } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', appt.doctor_id)
    .eq('appointment_datetime', newIsoDatetime)
    .neq('status', 'cancelled')
    .neq('id', appt.id)
    .maybeSingle()

  if (existingBooking) {
    throw new Error('The requested new time slot is already booked. Please choose another slot.')
  }

  // Update appointment datetime
  const { data: updated, error: updateErr } = await supabase
    .from('appointments')
    .update({
      appointment_datetime: newIsoDatetime,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appt.id)
    .select('*, doctors(*)')
    .single()

  if (updateErr) {
    throw new Error(`Failed to update appointment: ${updateErr.message}`)
  }

  return {
    success: true,
    message: 'Appointment successfully rescheduled.',
    appointment: {
      id: updated.id,
      patient_name: updated.patient_name,
      patient_phone: updated.patient_phone,
      doctor_name: updated.doctors?.name || 'Doctor',
      specialty: updated.doctors?.specialty || 'General',
      consultation_fee: updated.doctors?.consultation_fee || 500,
      appointment_datetime: updated.appointment_datetime,
      reason: updated.reason,
      status: updated.status,
    },
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(params: {
  appointment_id?: string
  patient_name?: string
}) {
  const supabase = await createClient()
  let apptId = params.appointment_id

  if (!apptId && params.patient_name) {
    const { data } = await supabase
      .from('appointments')
      .select('id, patient_name, appointment_datetime')
      .ilike('patient_name', `%${params.patient_name.trim()}%`)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) apptId = data.id
  }

  if (!apptId) {
    throw new Error(`Could not find an active appointment to cancel.`)
  }

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', apptId)
    .select('id, patient_name, appointment_datetime, status')
    .single()

  if (error) {
    throw new Error(`Failed to cancel appointment: ${error.message}`)
  }

  return {
    success: true,
    message: 'Appointment has been cancelled successfully.',
    appointment: data,
  }
}

/**
 * Look up existing appointments for a patient
 */
export async function getPatientAppointments(patientNameOrPhone: string) {
  const supabase = await createClient()
  const clean = patientNameOrPhone.trim()

  const { data, error } = await supabase
    .from('appointments')
    .select('id, patient_name, patient_phone, appointment_datetime, reason, status, doctors(name, specialty, consultation_fee)')
    .or(`patient_name.ilike.%${clean}%,patient_phone.ilike.%${clean}%`)
    .order('appointment_datetime', { ascending: false })
    .limit(5)

  if (error) throw new Error(`Search error: ${error.message}`)
  return data || []
}
