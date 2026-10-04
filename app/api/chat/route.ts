import { NextRequest, NextResponse } from 'next/server'
import { groq } from '@/lib/groq/groq'
import { SYSTEM_PROMPT } from '@/lib/constants/prompt'
import {
  getSpecialties,
  getDoctors,
  checkDoctorAvailability,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getPatientAppointments,
} from '@/lib/services/appointmentService'
import { createClient } from '@/lib/supabase/server'
import type { ChatCompletionTool, ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'

// Tool definitions for Groq function calling
const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_specialties',
      description: 'Fetch all available medical specialties offered at the clinic.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_doctors_by_specialty',
      description:
        'Fetch available doctors filtered by specialty (e.g. Cardiologist, Dermatologist, Orthopedist, General Physician).',
      parameters: {
        type: 'object',
        properties: {
          specialty: {
            type: 'string',
            description: 'The medical specialty to filter by, or empty to get all doctors.',
          },
        },
        required: ['specialty'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description:
        'Check real-time available time slots for a doctor on a specific date (YYYY-MM-DD). Accepts doctor name or UUID.',
      parameters: {
        type: 'object',
        properties: {
          doctor_id: {
            type: 'string',
            description: 'The doctor name (e.g. "Dr. Anita Joshi") or UUID.',
          },
          date: {
            type: 'string',
            description: 'The appointment date in YYYY-MM-DD format (e.g. 2026-10-05).',
          },
        },
        required: ['doctor_id', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description:
        'Saves and confirms the appointment in the clinic database. MUST be called to book.',
      parameters: {
        type: 'object',
        properties: {
          patient_name: {
            type: 'string',
            description: 'Full name of the patient.',
          },
          patient_phone: {
            type: 'string',
            description: 'Contact phone number of the patient (or "Not provided" if unknown).',
          },
          patient_email: {
            type: 'string',
            description: 'Optional email of the patient.',
          },
          doctor_id: {
            type: 'string',
            description: 'Doctor name (e.g. "Dr. Anita Joshi", "Dr. Arjun Mehta") or UUID.',
          },
          slot_time: {
            type: 'string',
            description:
              'Appointment date and time (e.g. "2026-10-05 16:00" or ISO format).',
          },
          reason: {
            type: 'string',
            description: 'Reason for visit or main symptom.',
          },
        },
        required: ['patient_name', 'doctor_id', 'slot_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_appointment',
      description:
        'Reschedule an existing patient appointment to a new date and time in the database.',
      parameters: {
        type: 'object',
        properties: {
          patient_name: {
            type: 'string',
            description: 'Patient name on the booking.',
          },
          new_slot_time: {
            type: 'string',
            description: 'New date and time (e.g. "2026-10-06 17:00" or ISO format).',
          },
          appointment_id: {
            type: 'string',
            description: 'Optional appointment reference UUID if known.',
          },
        },
        required: ['patient_name', 'new_slot_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description: 'Cancel an existing patient appointment in the database.',
      parameters: {
        type: 'object',
        properties: {
          patient_name: {
            type: 'string',
            description: 'Patient name on the booking.',
          },
          appointment_id: {
            type: 'string',
            description: 'Optional appointment reference UUID.',
          },
        },
        required: ['patient_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_appointments',
      description: 'Find active appointments for a patient by their name or phone number.',
      parameters: {
        type: 'object',
        properties: {
          patient_name_or_phone: {
            type: 'string',
            description: 'Patient name or phone number.',
          },
        },
        required: ['patient_name_or_phone'],
      },
    },
  },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages = [], session_key = null } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required.' },
        { status: 400 }
      )
    }

    // Dynamic current date/time context so the AI knows exact today/tomorrow
    const now = new Date()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayStr = now.toISOString().slice(0, 10)
    const dayOfWeek = days[now.getDay()]
    const timeStr = now.toTimeString().slice(0, 5)

    const dateContext = `\n\n## Temporal Context\n- Today: ${todayStr} (${dayOfWeek})\n- Time: ${timeStr}\n- When user says "today", use ${todayStr}.\n- When user says "tomorrow", calculate the next day in YYYY-MM-DD format.`

    const fullSystemPrompt = SYSTEM_PROMPT + dateContext

    // Format conversation for Groq
    const conversation: ChatCompletionMessageParam[] = [
      { role: 'system', content: fullSystemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content || '',
      })),
    ]

    // Detect user intent to guide model
    const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || ''
    const isConfirming =
      lastUserMsg.includes('confirm') ||
      lastUserMsg.includes('yes') ||
      lastUserMsg.includes('please book') ||
      lastUserMsg.includes('book it') ||
      lastUserMsg.includes('proceed')

    if (isConfirming) {
      conversation.push({
        role: 'system',
        content:
          'IMPORTANT INSTRUCTION: The patient is explicitly confirming. You MUST call `book_appointment` now to save it in the database. Do not reply with text only.',
      })
    }

    let actionData: any = null
    let maxLoops = 5

    while (maxLoops > 0) {
      maxLoops--

      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
        messages: conversation,
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.1,
        max_tokens: 1024,
      })

      const choice = completion.choices[0]
      const responseMessage = choice.message

      // Handle tool calls
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        conversation.push(responseMessage)

        for (const toolCall of responseMessage.tool_calls) {
          const fnName = toolCall.function.name
          let fnArgs: any = {}
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || '{}')
          } catch {
            fnArgs = {}
          }

          let toolResult: any = null

          try {
            console.log(`[CHAT API] Tool called: ${fnName}`, fnArgs)

            if (fnName === 'get_specialties') {
              const specialties = await getSpecialties()
              toolResult = { success: true, specialties }
            } else if (fnName === 'get_doctors_by_specialty') {
              const doctors = await getDoctors(fnArgs.specialty)
              toolResult = { success: true, specialty: fnArgs.specialty, doctors }
              actionData = { type: 'doctors_list', data: doctors }
            } else if (fnName === 'check_availability') {
              const availability = await checkDoctorAvailability(fnArgs.doctor_id, fnArgs.date)
              toolResult = { success: true, ...availability }
              actionData = { type: 'availability_slots', data: availability }
            } else if (fnName === 'book_appointment') {
              const booking = await bookAppointment({
                patient_name: fnArgs.patient_name,
                patient_phone: fnArgs.patient_phone || 'Not provided',
                patient_email: fnArgs.patient_email,
                doctor_id: fnArgs.doctor_id,
                slot_time: fnArgs.slot_time,
                reason: fnArgs.reason,
              })
              toolResult = booking
              actionData = { type: 'appointment_booked', data: booking.appointment }
              console.log('[CHAT API] Booked appointment in DB:', booking.appointment.id)
            } else if (fnName === 'reschedule_appointment') {
              const rescheduled = await rescheduleAppointment({
                patient_name: fnArgs.patient_name,
                new_slot_time: fnArgs.new_slot_time,
                appointment_id: fnArgs.appointment_id,
              })
              toolResult = rescheduled
              actionData = { type: 'appointment_booked', data: rescheduled.appointment }
              console.log('[CHAT API] Rescheduled appointment in DB:', rescheduled.appointment.id)
            } else if (fnName === 'cancel_appointment') {
              const cancelled = await cancelAppointment({
                patient_name: fnArgs.patient_name,
                appointment_id: fnArgs.appointment_id,
              })
              toolResult = cancelled
            } else if (fnName === 'get_patient_appointments') {
              const list = await getPatientAppointments(fnArgs.patient_name_or_phone)
              toolResult = { success: true, appointments: list }
            } else {
              toolResult = { success: false, error: `Unknown tool: ${fnName}` }
            }
          } catch (err: any) {
            console.error(`[CHAT API] Error in ${fnName}:`, err.message)
            toolResult = {
              success: false,
              error: `FAILED: ${err.message}. You MUST NOT claim success. Tell the user the error and ask for correct information.`,
            }
          }

          conversation.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          })
        }

        continue
      }

      // Final response
      let assistantText = responseMessage.content || ''

      // ─── Auto-Recovery Guard ──────────────────────────────────────────
      // If the model generated text claiming the appointment is booked/confirmed
      // but didn't execute the tool, we parse the details and save it immediately!
      if (!actionData || actionData.type !== 'appointment_booked') {
        const lower = assistantText.toLowerCase()
        const claimsBooked =
          lower.includes('successfully booked') ||
          lower.includes('appointment has been booked') ||
          lower.includes('appointment is booked') ||
          lower.includes('appointment is confirmed') ||
          lower.includes('booked your appointment')

        if (claimsBooked) {
          console.log('[CHAT API] Model output confirmation text without calling tool! Auto-saving to Supabase...')

          const patientMatch = assistantText.match(/Patient:\s*([^\n\r]+)/i)
          const doctorMatch = assistantText.match(/Doctor:\s*([^\n\r(]+)/i)
          const dateMatch = assistantText.match(/(\d{4}-\d{2}-\d{2})/)
          const timeMatch = assistantText.match(/(\d{1,2}:\d{2})/)
          const reasonMatch = assistantText.match(/Reason:\s*([^\n\r]+)/i)
          const phoneMatch = assistantText.match(/Phone:\s*([^\n\r]+)/i)

          const patientName = patientMatch ? patientMatch[1].trim() : 'Patient'
          const doctorName = doctorMatch ? doctorMatch[1].trim() : null
          const slotDate = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10)
          const slotTime = timeMatch ? `${slotDate} ${timeMatch[1]}` : `${slotDate} 10:00`
          const reason = reasonMatch ? reasonMatch[1].trim() : 'General Consultation'
          const phone = phoneMatch ? phoneMatch[1].trim() : 'Not provided'

          if (doctorName) {
            try {
              const booking = await bookAppointment({
                patient_name: patientName,
                patient_phone: phone,
                doctor_id: doctorName,
                slot_time: slotTime,
                reason: reason,
              })
              actionData = { type: 'appointment_booked', data: booking.appointment }
              console.log('[CHAT API] Auto-saved to Supabase successfully! ID:', booking.appointment.id)
            } catch (fallbackErr: any) {
              console.error('[CHAT API] Auto-save fallback error:', fallbackErr.message)
            }
          }
        }
      }

      if (session_key) {
        try {
          const supabase = await createClient()
          const newMessages = [
            ...messages,
            { role: 'assistant', content: assistantText, actionData },
          ]
          await supabase.from('chat_sessions').upsert(
            {
              session_key,
              messages: newMessages,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'session_key' }
          )
        } catch (saveErr) {
          console.error('Failed to persist chat session:', saveErr)
        }
      }

      return NextResponse.json({
        success: true,
        message: assistantText,
        actionData,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'I processed your request, but could not finish in time. Please try again.',
    })
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process chat message with AI.',
      },
      { status: 500 }
    )
  }
}
