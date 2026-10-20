import type { Certificate } from '@/types'
import { Logo } from '@/components/layout/Brand'
import { useStore } from '@/state/store'

/** The certificate itself. Sized for landscape A4/Letter when printed. */
export function CertificateDocument({ cert }: { cert: Certificate }) {
  const { data } = useStore()
  const s = data.settings.certificate
  const issued = new Date(cert.issuedAt).toLocaleDateString(data.settings.language, { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="certificate relative mx-auto aspect-[1.414/1] w-full max-w-[960px] overflow-hidden bg-[#fffdf8] text-[#1d1b2e] shadow-lg print:shadow-none" style={{ fontSize: 'clamp(9px, 1.6vw, 15px)' }}>
      <div className="absolute inset-[3%] border-[0.25em] border-double" style={{ borderColor: 'var(--primary)' }} />
      <div className="absolute inset-[4.2%] border" style={{ borderColor: 'color-mix(in oklab, var(--primary) 30%, transparent)' }} />
      {cert.status === 'revoked' && (
        <div className="absolute inset-0 z-10 grid place-items-center">
          <span className="-rotate-12 rounded-lg border-4 border-[#b42318] px-6 py-2 text-[3em] font-bold tracking-wider text-[#b42318]/80">REVOKED</span>
        </div>
      )}
      <div className="relative flex h-full flex-col items-center px-[10%] py-[8%] text-center">
        <div className="flex items-center gap-[0.6em]">
          <Logo className="size-[2.6em] rounded-md" />
          <span className="font-display text-[1.25em] font-semibold">{cert.issuer}</span>
        </div>
        <p className="mt-[6%] text-[0.85em] font-semibold tracking-[0.2em] text-[#6b6880]">CERTIFICATE OF COMPLETION</p>
        <p className="mt-[3%] text-[1em] text-[#55536a]">This certifies that</p>
        <p className="mt-[1.5%] font-display text-[3em] leading-tight font-semibold">{cert.studentName}</p>
        <p className="mt-[2%] text-[1em] text-[#55536a]">has successfully completed the course</p>
        <p className="mt-[1.5%] max-w-[85%] font-display text-[1.7em] leading-snug font-semibold" style={{ color: 'var(--primary)' }}>{cert.courseTitle}</p>
        <p className="mt-[1.5%] text-[0.95em] text-[#55536a]">taught by {cert.instructorName}</p>
        <div className="mt-auto grid w-full grid-cols-3 items-end gap-[4%] text-[0.85em]">
          <div className="text-left">
            <p className="font-display text-[1.3em] italic">{s.signatoryName}</p>
            <p className="mt-[0.3em] border-t border-[#c9c6d6] pt-[0.3em] text-[#6b6880]">{s.signatoryTitle}</p>
          </div>
          <div className="grid place-items-center">
            {s.showSeal && (
              <svg viewBox="0 0 100 100" className="size-[5.5em]" aria-hidden>
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--highlight)" strokeWidth="3" strokeDasharray="4 3" />
                <circle cx="50" cy="50" r="36" fill="var(--highlight)" opacity=".14" />
                <path d="M34 52l11 10 22-25" fill="none" stroke="var(--highlight)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="text-right">
            <p className="font-medium">{issued}</p>
            <p className="mt-[0.3em] border-t border-[#c9c6d6] pt-[0.3em] text-[#6b6880]">Date issued</p>
          </div>
        </div>
        <p className="mt-[3%] text-[0.75em] text-[#6b6880]">
          Certificate ID <span className="font-semibold text-[#1d1b2e]">{cert.code}</span> · {s.footnote} {location.origin}/verify/{cert.code}
        </p>
      </div>
    </div>
  )
}
