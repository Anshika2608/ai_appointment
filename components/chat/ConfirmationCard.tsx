'use client'

import React, { useState } from 'react'

export interface AppointmentDetails {
  id: string
  patient_name: string
  patient_phone: string
  patient_email?: string
  doctor_name: string
  specialty: string
  consultation_fee?: number
  appointment_datetime: string
  reason?: string
  status?: string
}

interface ConfirmationCardProps {
  appointment: AppointmentDetails
}

/**
 * Format datetime safely without unwanted browser timezone shifting
 */
function formatAppointmentDatetime(isoString: string) {
  if (!isoString) return { formattedDate: 'Scheduled', formattedTime: 'Pending' }

  // 1. Direct regex extraction to prevent browser timezone offsets
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/)
  if (match) {
    const [_, year, month, day, hours, minutes] = match
    const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    const weekday = dateObj.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' })
    const monthName = dateObj.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' })

    let h = Number(hours)
    const m = minutes
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    const formattedTime = `${String(h).padStart(2, '0')}:${m} ${ampm}`
    const formattedDate = `${weekday}, ${monthName} ${Number(day)}, ${year}`

    return { formattedDate, formattedTime }
  }

  // 2. Fallback with explicit UTC timezone
  const d = new Date(isoString)
  return {
    formattedDate: d.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    formattedTime: d.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  }
}

export function ConfirmationCard({ appointment }: ConfirmationCardProps) {
  const [copied, setCopied] = useState(false)

  const { formattedDate, formattedTime } = formatAppointmentDatetime(appointment.appointment_datetime)

  const copyDetails = () => {
    const text = `HealthPlus Clinic Appointment\nID: ${appointment.id}\nPatient: ${appointment.patient_name}\nDoctor: ${appointment.doctor_name} (${appointment.specialty})\nDate: ${formattedDate} at ${formattedTime}\nFee: ₹${appointment.consultation_fee || 500}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border-2 border-emerald-300 rounded-3xl p-5 shadow-sm my-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            ✓
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">
              Appointment Confirmed!
            </h3>
            <p className="text-[11px] text-emerald-700">
              Ref: <span className="font-mono">{appointment.id?.slice(0, 8)}...</span>
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
          {appointment.status || 'Confirmed'}
        </span>
      </div>

      {/* Grid details */}
      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
          <span className="text-[10px] text-zinc-400 block uppercase font-light">Doctor</span>
          <span className="font-medium text-zinc-900">{appointment.doctor_name}</span>
          <span className="text-[11px] text-emerald-700 font-medium block">{appointment.specialty}</span>
        </div>

        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
          <span className="text-[10px] text-zinc-400 block uppercase font-light">Patient</span>
          <span className="font-medium text-zinc-900">{appointment.patient_name}</span>
          <span className="text-[11px] text-zinc-500 block">{appointment.patient_phone}</span>
        </div>

        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
          <span className="text-[10px] text-zinc-400 block uppercase font-light">Date & Time</span>
          <span className="font-medium text-zinc-900">{formattedDate}</span>
          <span className="text-[11px] text-emerald-700 font-semibold block">{formattedTime}</span>
        </div>

        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
          <span className="text-[10px] text-zinc-400 block uppercase font-light">Fee</span>
          <span className="font-bold text-emerald-700 text-sm">₹{appointment.consultation_fee || 500}</span>
          <span className="text-[10px] text-zinc-400 block font-light">Pay at clinic</span>
        </div>
      </div>

      {appointment.reason && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs">
          <span className="text-[10px] text-zinc-400 block uppercase font-light">Reason for Visit</span>
          <p className="text-zinc-700 mt-0.5 font-light">{appointment.reason}</p>
        </div>
      )}

      {/* Footer copy button */}
      <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-zinc-400 font-light">
          📍 HealthPlus Super-Specialty Clinic, 2nd Floor
        </span>
        <button
          onClick={copyDetails}
          className="font-medium text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
        >
          {copied ? '✓ Copied' : '📋 Copy Details'}
        </button>
      </div>
    </div>
  )
}
