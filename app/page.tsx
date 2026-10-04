import Link from 'next/link'

export default function Home() {
  const doctors = [
    {
      name: 'Dr. Priya Sharma',
      specialty: 'Cardiologist',
      exp: '12 yrs exp',
      fee: '₹800',
      badge: 'Heart & BP',
      qualification: 'MBBS, MD',
    },
    {
      name: 'Dr. Arjun Mehta',
      specialty: 'Cardiologist',
      exp: '8 yrs exp',
      fee: '₹750',
      badge: 'Interventional',
      qualification: 'MBBS, DM',
    },
    {
      name: 'Dr. Neha Gupta',
      specialty: 'Dermatologist',
      exp: '10 yrs exp',
      fee: '₹600',
      badge: 'Skin & Acne',
      qualification: 'MBBS, MD',
    },
    {
      name: 'Dr. Rahul Verma',
      specialty: 'Orthopedist',
      exp: '15 yrs exp',
      fee: '₹700',
      badge: 'Joints & Spine',
      qualification: 'MBBS, MS',
    },
    {
      name: 'Dr. Anita Joshi',
      specialty: 'General Physician',
      exp: '6 yrs exp',
      fee: '₹400',
      badge: 'Family Care',
      qualification: 'MBBS, MD',
    },
  ]

  return (
    <div className="min-h-screen bg-[#fafcfb] text-zinc-900 font-sans flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* ─── Top Navbar ─────────────────────────────────── */}
      <header className="h-20 px-6 sm:px-12 max-w-7xl w-full mx-auto flex items-center justify-between border-b border-emerald-100/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            🩺
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-zinc-900">
              HealthPlus <span className="text-emerald-600 font-serif italic">Clinic</span>
            </span>
            <span className="block text-[11px] text-zinc-400 font-normal">
              AI-Powered Healthcare Schedule
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/chat"
            className="px-5 py-2.5 text-xs sm:text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Book Appointment</span>
            <span className="text-emerald-200">→</span>
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors hidden sm:inline-block"
          >
            Admin
          </Link>
        </nav>
      </header>

      {/* ─── Hero Section ───────────────────────────────── */}
      <main className="max-w-6xl w-full mx-auto px-6 pt-16 sm:pt-24 pb-20 flex-1">
        <section className="flex flex-col items-center text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-medium tracking-wide shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Intelligent Doctor Scheduling</span>
          </div>

          {/* Thin Stroke & Styled Text Hero Headline */}
          <h1 className="mt-8 text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight max-w-4xl text-zinc-900 leading-[1.12]">
            Book the right doctor,
            <br />
            <span className="font-serif italic font-normal text-emerald-600 tracking-normal inline-block mt-1">
              simply by chatting.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg font-light text-zinc-500 max-w-2xl leading-relaxed">
            Tell MediBot what you need in your own words. It routes your symptoms to the right specialist, checks real-time morning & evening split shifts, and confirms your visit in seconds.
          </p>

          {/* Primary CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3.5">
            <Link
              href="/chat"
              className="group px-8 py-4 rounded-2xl bg-emerald-600 text-white font-medium text-base shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <span>Start Your Booking</span>
              <span className="text-emerald-200 group-hover:translate-x-1 transition-transform">→</span>
            </Link>

            <Link
              href="/chat"
              className="px-6 py-4 rounded-2xl bg-white border border-emerald-200/90 text-emerald-800 font-medium text-sm hover:bg-emerald-50/60 transition-colors shadow-xs"
            >
              Ask MediBot a Question
            </Link>
          </div>

          <p className="mt-3 text-xs text-zinc-400 font-light">
            No complicated forms. Real-time availability synced with clinic database.
          </p>
        </section>

        {/* ─── Doctors Showcase (White & Green Theme) ───────── */}
        <section className="mt-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Medical Team
              </p>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-normal tracking-tight text-zinc-900">
                Meet our on-duty <span className="font-serif italic font-normal text-emerald-600">specialists</span>
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-zinc-500 font-light">
                Consultation slots available across Morning (09:00 - 13:00) & Evening (16:00 - 21:00) shifts.
              </p>
            </div>

            <Link
              href="/chat"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline hidden sm:inline-block"
            >
              View Full Availability →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {doctors.map((doc) => (
              <div
                key={doc.name}
                className="bg-white border border-emerald-100/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <span className="inline-flex text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    {doc.badge}
                  </span>

                  <h3 className="font-medium text-sm text-zinc-900 mt-3.5 group-hover:text-emerald-700 transition-colors">
                    {doc.name}
                  </h3>

                  <p className="text-xs text-emerald-600 font-medium mt-0.5">
                    {doc.specialty}
                  </p>

                  <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                    {doc.qualification}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-emerald-50 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-light text-[11px]">{doc.exp}</span>
                  <span className="font-semibold text-emerald-700">{doc.fee}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 3 Clean Feature Highlights ───────────────────── */}
        <section className="mt-24">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Why Choose HealthPlus
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
              Healthcare scheduling, <span className="font-serif italic font-normal text-emerald-600">reimagined</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-emerald-100/90 rounded-3xl p-7 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-5 border border-emerald-100">
                💬
              </div>
              <h3 className="text-base font-medium text-zinc-900">
                Natural Conversation
              </h3>
              <p className="text-sm font-light text-zinc-500 mt-2 leading-relaxed">
                Describe your symptoms naturally. MediBot analyzes your concern and matches you to the right specialty without guesswork.
              </p>
            </div>

            <div className="bg-white border border-emerald-100/90 rounded-3xl p-7 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-5 border border-emerald-100">
                🌅
              </div>
              <h3 className="text-base font-medium text-zinc-900">
                Split Shift Schedules
              </h3>
              <p className="text-sm font-light text-zinc-500 mt-2 leading-relaxed">
                Choose between Morning and Evening consultation hours. Our system respects doctors&apos; rest intervals and prevents conflicts.
              </p>
            </div>

            <div className="bg-white border border-emerald-100/90 rounded-3xl p-7 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-5 border border-emerald-100">
                ✓
              </div>
              <h3 className="text-base font-medium text-zinc-900">
                Immediate Confirmation
              </h3>
              <p className="text-sm font-light text-zinc-500 mt-2 leading-relaxed">
                Your appointment is securely locked into the clinic database with real-time verification and a digital confirmation ticket.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA Banner ────────────────────────────── */}
        <section className="mt-20 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-8 sm:p-12 text-center text-white shadow-xl shadow-emerald-600/15">
          <h2 className="text-2xl sm:text-4xl font-light tracking-tight">
            Ready to book your <span className="font-serif italic font-normal text-emerald-100">consultation?</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base font-light text-emerald-50/90 max-w-lg mx-auto">
            Start a chat with MediBot right now. It takes less than 60 seconds to secure your doctor appointment.
          </p>
          <div className="mt-8">
            <Link
              href="/chat"
              className="inline-flex px-8 py-3.5 rounded-xl bg-white text-emerald-700 font-medium text-sm hover:bg-emerald-50 shadow-md transition-all active:scale-95"
            >
              Chat with MediBot Now →
            </Link>
          </div>
        </section>
      </main>

      {/* ─── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-emerald-100/80 bg-white py-8 px-6 text-center text-xs text-zinc-400">
        <p>© 2026 HealthPlus Super-Specialty Clinic. All rights reserved.</p>
        <p className="mt-1 text-[11px] text-zinc-400 font-light">
          MediBot is an appointment scheduling assistant and does not provide medical diagnoses.
        </p>
      </footer>
    </div>
  )
}
