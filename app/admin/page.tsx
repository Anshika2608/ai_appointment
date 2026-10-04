'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'

interface Doctor {
  id: string
  name: string
  specialty: string
  consultation_fee: number
}

interface Appointment {
  id: string
  patient_name: string
  patient_phone: string
  patient_email?: string | null
  user_id?: string | null
  doctor_id: string
  appointment_datetime: string
  reason?: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  admin_notes?: string | null
  created_at: string
  doctors?: Doctor | null
}

function formatSafeDatetime(isoString: string) {
  if (!isoString) return { dateStr: 'N/A', timeStr: 'N/A' }
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
    const timeStr = `${String(h).padStart(2, '0')}:${m} ${ampm}`
    const dateStr = `${weekday}, ${monthName} ${Number(day)}, ${year}`
    return { dateStr, timeStr }
  }

  const d = new Date(isoString)
  return {
    dateStr: d.toLocaleDateString('en-US', { dateStyle: 'medium' }),
    timeStr: d.toLocaleTimeString('en-US', { timeStyle: 'short' }),
  }
}

export default function AdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [doctorFilter, setDoctorFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'datetime-desc' | 'datetime-asc' | 'created-desc'>('datetime-desc')

  // Modals state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  // Reschedule Modal
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [isRescheduling, setIsRescheduling] = useState(false)

  // New Booking Modal
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false)
  const [newPatientName, setNewPatientName] = useState('')
  const [newPatientPhone, setNewPatientPhone] = useState('')
  const [newPatientEmail, setNewPatientEmail] = useState('')
  const [newDoctorId, setNewDoctorId] = useState('')
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotTime, setNewSlotTime] = useState('10:00')
  const [newReason, setNewReason] = useState('')
  const [isSubmittingNew, setIsSubmittingNew] = useState(false)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // 1. Fetch current session and appointments
  const fetchAppointments = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const [apptRes, docRes, userRes] = await Promise.all([
        fetch('/api/appointments?limit=200'),
        fetch('/api/doctors'),
        fetch('/api/auth/me'),
      ])

      const [apptData, docData, userData] = await Promise.all([
        apptRes.json(),
        docRes.json(),
        userRes.json(),
      ])

      if (apptData.success && Array.isArray(apptData.appointments)) {
        setAppointments(apptData.appointments)
      }

      if (docData.success && Array.isArray(docData.doctors)) {
        setDoctors(docData.doctors)
        if (!newDoctorId && docData.doctors.length > 0) {
          setNewDoctorId(docData.doctors[0].id)
        }
      }

      if (userData.authenticated) {
        setCurrentUser(userData.user)
      }
    } catch (err: any) {
      console.error('Admin fetch error:', err)
      showNotification('Failed to load appointments data.', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [newDoctorId])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Update Status
  const handleUpdateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status')
      }

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      )
      showNotification(`Appointment marked as ${newStatus}!`)
    } catch (err: any) {
      showNotification(err.message || 'Error updating status', 'error')
    }
  }

  // Save Admin Note
  const handleSaveNotes = async (id: string) => {
    setIsSavingNote(true)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: notesDraft }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save notes')
      }

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, admin_notes: notesDraft } : a))
      )
      setEditingNotesId(null)
      showNotification('Staff note saved successfully!')
    } catch (err: any) {
      showNotification(err.message || 'Error saving notes', 'error')
    } finally {
      setIsSavingNote(false)
    }
  }

  // Reschedule
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reschedulingAppt || !newDate || !newTime) return

    setIsRescheduling(true)
    try {
      const formattedDatetime = `${newDate} ${newTime}`
      const res = await fetch(`/api/appointments/${reschedulingAppt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_datetime: formattedDatetime,
          status: 'confirmed',
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reschedule')
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === reschedulingAppt.id
            ? { ...a, appointment_datetime: formattedDatetime, status: 'confirmed' }
            : a
        )
      )
      setReschedulingAppt(null)
      showNotification('Appointment rescheduled successfully!')
    } catch (err: any) {
      showNotification(err.message || 'Error rescheduling', 'error')
    } finally {
      setIsRescheduling(false)
    }
  }

  // Delete
  const handleDelete = async (id: string, patientName: string) => {
    if (!confirm(`Are you sure you want to permanently delete appointment for "${patientName}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete appointment')
      }

      setAppointments((prev) => prev.filter((a) => a.id !== id))
      showNotification(`Appointment for ${patientName} deleted.`)
    } catch (err: any) {
      showNotification(err.message || 'Error deleting appointment', 'error')
    }
  }

  // Create Manual Appointment
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPatientName.trim() || !newDoctorId || !newSlotDate || !newSlotTime) {
      showNotification('Please fill all required fields.', 'error')
      return
    }

    setIsSubmittingNew(true)
    try {
      const slot_time = `${newSlotDate} ${newSlotTime}`
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: newPatientName.trim(),
          patient_phone: newPatientPhone.trim() || 'Not provided',
          patient_email: newPatientEmail.trim() || undefined,
          doctor_id: newDoctorId,
          slot_time,
          reason: newReason.trim() || 'General Consultation',
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create appointment')
      }

      showNotification('New appointment booked successfully!')
      setIsNewBookingOpen(false)
      setNewPatientName('')
      setNewPatientPhone('')
      setNewPatientEmail('')
      setNewReason('')
      fetchAppointments(true)
    } catch (err: any) {
      showNotification(err.message || 'Failed to create appointment', 'error')
    } finally {
      setIsSubmittingNew(false)
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showNotification(`Copied ${label} to clipboard!`)
  }

  // Filtered & Sorted Appointments
  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((appt) => {
        // Status filter
        if (statusFilter !== 'all' && appt.status !== statusFilter) {
          return false
        }
        // Doctor filter
        if (doctorFilter !== 'all' && appt.doctor_id !== doctorFilter) {
          return false
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const nameMatch = appt.patient_name.toLowerCase().includes(q)
          const phoneMatch = appt.patient_phone?.toLowerCase().includes(q)
          const emailMatch = appt.patient_email?.toLowerCase().includes(q)
          const doctorMatch = appt.doctors?.name?.toLowerCase().includes(q)
          const specialtyMatch = appt.doctors?.specialty?.toLowerCase().includes(q)
          const reasonMatch = appt.reason?.toLowerCase().includes(q)
          const idMatch = appt.id.toLowerCase().includes(q)
          return nameMatch || phoneMatch || emailMatch || doctorMatch || specialtyMatch || reasonMatch || idMatch
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'datetime-desc') {
          return new Date(b.appointment_datetime).getTime() - new Date(a.appointment_datetime).getTime()
        }
        if (sortBy === 'datetime-asc') {
          return new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime()
        }
        if (sortBy === 'created-desc') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        return 0
      })
  }, [appointments, statusFilter, doctorFilter, searchQuery, sortBy])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = appointments.length
    const confirmed = appointments.filter((a) => a.status === 'confirmed').length
    const pending = appointments.filter((a) => a.status === 'pending').length
    const completed = appointments.filter((a) => a.status === 'completed').length
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length

    const revenue = appointments
      .filter((a) => a.status === 'confirmed' || a.status === 'completed')
      .reduce((sum, a) => sum + (a.doctors?.consultation_fee || 500), 0)

    return { total, confirmed, pending, completed, cancelled, revenue }
  }, [appointments])

  return (
    <div className="min-h-screen bg-[#fafcfb] text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20">
      {/* ─── Notification Toast ─────────────────────────────── */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-medium border transition-all animate-bounce ${
            notification.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200 shadow-red-900/10'
              : 'bg-emerald-900 text-white border-emerald-700 shadow-emerald-950/20'
          }`}
        >
          <span>{notification.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* ─── Top Admin Header ───────────────────────────────── */}
      <header className="h-20 px-4 sm:px-8 border-b border-emerald-100/90 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                🩺
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900">
                    HealthPlus <span className="text-emerald-600 font-serif italic">Admin</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                    Clinic Management
                  </span>
                </div>
                <span className="block text-[11px] text-zinc-400 font-light">
                  Real-time Booking & Patient Operations
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            <button
              onClick={() => setIsNewBookingOpen(true)}
              className="px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>+</span>
              <span>New Booking</span>
            </button>

            <Link
              href="/chat"
              className="px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-emerald-200/80 text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
            >
              <span>💬</span>
              <span className="hidden sm:inline">AI Chat</span>
            </Link>

            <Link
              href="/"
              className="px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors hidden md:inline-block"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        {/* KPI Metrics Summary Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 mb-8">
          <div className="bg-white p-4 rounded-3xl border border-emerald-100/90 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Bookings</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-bold text-zinc-900">{metrics.total}</span>
              <span className="text-xs text-zinc-400">records</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Confirmed</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-bold text-emerald-700">{metrics.confirmed}</span>
              <span className="text-xs text-emerald-600/70">active</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-bold text-amber-700">{metrics.pending}</span>
              <span className="text-xs text-amber-600/70">queued</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-blue-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Completed</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-bold text-blue-700">{metrics.completed}</span>
              <span className="text-xs text-blue-600/70">served</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-rose-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Cancelled</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-bold text-rose-700">{metrics.cancelled}</span>
              <span className="text-xs text-rose-600/70">removed</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-3xl shadow-sm text-white flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Est. Revenue</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl sm:text-3xl font-bold">₹{metrics.revenue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </section>

        {/* ─── Search, Filters & Controls Bar ───────────────── */}
        <section className="bg-white rounded-3xl border border-emerald-100/90 p-4 sm:p-5 mb-8 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, phone, doctor, specialty, or ID..."
                className="w-full pl-9 pr-8 py-2.5 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Doctor and Sort dropdowns */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="px-3 py-2.5 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-xs sm:text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="all">👨‍⚕️ All Doctors ({doctors.length})</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.specialty})
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-xs sm:text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="datetime-desc">📅 Slot Date: Newest</option>
                <option value="datetime-asc">📅 Slot Date: Oldest</option>
                <option value="created-desc">⏱️ Booked: Most Recent</option>
              </select>
            </div>
          </div>

          {/* Status Tabs Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-zinc-100 pt-3">
            {[
              { id: 'all', label: 'All Bookings', count: metrics.total },
              { id: 'confirmed', label: 'Confirmed', count: metrics.confirmed },
              { id: 'pending', label: 'Pending', count: metrics.pending },
              { id: 'completed', label: 'Completed', count: metrics.completed },
              { id: 'cancelled', label: 'Cancelled', count: metrics.cancelled },
            ].map((tab) => {
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ─── Appointments Cards Grid ──────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-xs animate-pulse space-y-4"
              >
                <div className="h-5 bg-zinc-100 rounded-lg w-2/3" />
                <div className="h-4 bg-zinc-100 rounded-lg w-1/2" />
                <div className="h-16 bg-zinc-50 rounded-2xl" />
                <div className="h-10 bg-zinc-100 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-emerald-100/90 p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 text-2xl flex items-center justify-center mx-auto mb-4">
              📋
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">No appointments found</h3>
            <p className="text-xs text-zinc-500 mt-1.5 font-light">
              {searchQuery || statusFilter !== 'all' || doctorFilter !== 'all'
                ? 'Try adjusting your search criteria or filter options.'
                : 'There are no patient appointments scheduled yet.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setDoctorFilter('all')
              }}
              className="mt-5 px-4 py-2 text-xs font-medium rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAppointments.map((appt) => {
              const { dateStr, timeStr } = formatSafeDatetime(appt.appointment_datetime)
              const isNotesOpen = editingNotesId === appt.id

              return (
                <div
                  key={appt.id}
                  className="bg-white rounded-3xl border border-emerald-100/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Top Bar with Status and ID */}
                  <div className="p-5 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            appt.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : appt.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : appt.status === 'completed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              appt.status === 'confirmed'
                                ? 'bg-emerald-500'
                                : appt.status === 'pending'
                                ? 'bg-amber-500'
                                : appt.status === 'completed'
                                ? 'bg-blue-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {appt.status}
                        </span>
                        {appt.user_id ? (
                          <span className="text-[10px] text-zinc-400 font-light" title={`User ID: ${appt.user_id}`}>
                            👤 Reg. User
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-light">🏷️ Guest</span>
                        )}
                      </div>

                      <button
                        onClick={() => copyToClipboard(appt.id, 'Appointment ID')}
                        title="Copy Appointment UUID"
                        className="text-[10px] font-mono text-zinc-400 hover:text-zinc-600 p-1 rounded hover:bg-zinc-100 transition-colors"
                      >
                        #{appt.id.slice(0, 8)} 📋
                      </button>
                    </div>

                    {/* Patient Information */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-800 font-semibold text-base flex-shrink-0">
                        {appt.patient_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-zinc-900 text-base tracking-tight truncate">
                          {appt.patient_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <a
                            href={`tel:${appt.patient_phone}`}
                            className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                          >
                            📞 {appt.patient_phone}
                          </a>
                          {appt.patient_email && (
                            <a
                              href={`mailto:${appt.patient_email}`}
                              className="text-xs text-zinc-500 hover:text-zinc-700 truncate"
                              title={appt.patient_email}
                            >
                              ✉️ {appt.patient_email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Doctor & Schedule Box */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-[#f8faf9] border border-emerald-100/70 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-zinc-800">
                            {appt.doctors?.name || 'General Doctor'}
                          </p>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            {appt.doctors?.specialty || 'Consultant'}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-zinc-700 bg-white px-2 py-1 rounded-xl border border-zinc-200/60 shadow-2xs">
                          ₹{appt.doctors?.consultation_fee || 500}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-600 border-t border-emerald-100/50 pt-2 font-medium">
                        <span className="flex items-center gap-1">
                          📅 <span>{dateStr}</span>
                        </span>
                        <span className="flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                          ⏰ <span>{timeStr}</span>
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    {appt.reason && (
                      <div className="mt-3 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 italic">
                        <span className="font-semibold text-zinc-500 not-italic">Reason:</span> &ldquo;
                        {appt.reason}&rdquo;
                      </div>
                    )}

                    {/* Admin Notes Section */}
                    <div className="mt-3">
                      {isNotesOpen ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            placeholder="Add staff notes (e.g. 'Lab reports needed', 'Follow-up visit')..."
                            className="w-full text-xs p-2.5 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            rows={3}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNotes(appt.id)}
                              disabled={isSavingNote}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-xs cursor-pointer"
                            >
                              {isSavingNote ? 'Saving...' : 'Save Note'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingNotesId(appt.id)
                            setNotesDraft(appt.admin_notes || '')
                          }}
                          className="cursor-pointer text-xs text-zinc-500 hover:text-emerald-700 flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50/50 transition-colors"
                        >
                          <span className="truncate">
                            📝 {appt.admin_notes ? `Note: ${appt.admin_notes}` : 'Click to add internal note...'}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium">Edit</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-2">
                    {/* Status change actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {appt.status !== 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 rounded-lg transition-colors cursor-pointer"
                        >
                          Confirm
                        </button>
                      )}
                      {appt.status !== 'completed' && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'completed')}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100/70 hover:bg-blue-200/80 rounded-lg transition-colors cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                      {appt.status !== 'cancelled' && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                          className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-100/70 hover:bg-rose-200/80 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {/* Reschedule & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setReschedulingAppt(appt)
                          const m = appt.appointment_datetime.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/)
                          if (m) {
                            setNewDate(m[1])
                            setNewTime(m[2])
                          } else {
                            setNewDate(new Date().toISOString().slice(0, 10))
                            setNewTime('10:00')
                          }
                        }}
                        title="Reschedule appointment date & time"
                        className="p-1.5 text-zinc-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors text-xs font-medium cursor-pointer"
                      >
                        ⏱️
                      </button>
                      <button
                        onClick={() => handleDelete(appt.id, appt.patient_name)}
                        title="Permanently remove appointment"
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors text-xs cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ─── Reschedule Modal ───────────────────────────────── */}
      {reschedulingAppt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Reschedule Appointment</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Patient: <span className="font-semibold">{reschedulingAppt.patient_name}</span>
                </p>
              </div>
              <button
                onClick={() => setReschedulingAppt(null)}
                className="text-zinc-400 hover:text-zinc-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">New Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-emerald-200/80 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">New Time Slot</label>
                <input
                  type="time"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-emerald-200/80 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setReschedulingAppt(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRescheduling}
                  className="px-5 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── New Manual Booking Modal ───────────────────────── */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Manual Appointment Booking</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Book a patient directly into clinic schedule</p>
              </div>
              <button
                onClick={() => setIsNewBookingOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-emerald-200/80 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-emerald-200/80 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={newPatientEmail}
                    onChange={(e) => setNewPatientEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-emerald-200/80 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Select Doctor *</label>
                <select
                  required
                  value={newDoctorId}
                  onChange={(e) => setNewDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-emerald-200/80 rounded-2xl text-xs sm:text-sm text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty} (₹{d.consultation_fee})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-emerald-200/80 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Slot Time *</label>
                  <input
                    type="time"
                    required
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-emerald-200/80 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Reason for Visit</label>
                <input
                  type="text"
                  placeholder="e.g. Chest pain checkup, skin allergy review"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-emerald-200/80 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingNew ? 'Creating Booking...' : 'Save & Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
