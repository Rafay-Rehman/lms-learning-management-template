import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { BadgeCheck, SearchX, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/misc'
import { useStore } from '@/state/store'
import { CertificateDocument } from './CertificateDocument'

/** Public verification. Reads this browser's demo data — production verification must query a server. */
export default function VerifyPage() {
  const { code: param } = useParams()
  const { data } = useStore()
  const navigate = useNavigate()
  const [code, setCode] = useState(param ?? '')
  const lookup = (param ?? '').trim().toUpperCase()
  const cert = lookup ? data.certificates.find((c) => c.code === lookup) : undefined
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim()) navigate(`/verify/${encodeURIComponent(code.trim().toUpperCase())}`)
  }
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-[2rem] font-semibold">Verify a certificate</h1>
        <p className="mt-2 text-muted">Enter the certificate ID printed at the bottom of the certificate, for example LCT-7K4Q-2M9X.</p>
      </div>
      <form onSubmit={submit} className="mt-6 flex max-w-xl gap-2">
        <label className="flex-1">
          <span className="sr-only">Certificate ID</span>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LCT-XXXX-XXXX" className="h-11 font-mono uppercase" maxLength={20} />
        </label>
        <Button type="submit" variant="primary" className="h-11">Verify</Button>
      </form>
      <p className="mt-2 text-xs text-faint">Demo: this checks the certificates stored in this browser. A production deployment must verify against the issuing server — IDs generated in the browser are not tamper-proof credentials.</p>

      {lookup && (
        <div className="mt-10">
          {!cert ? (
            <EmptyState icon={<SearchX />} title={`No certificate found for ${lookup}`} body="Check the ID for typos. IDs use letters and numbers, without O, I, 0 or 1." className="panel" />
          ) : (
            <div className="space-y-6">
              <div className={`panel flex items-start gap-4 p-5 ${cert.status === 'valid' ? 'border-success/40' : 'border-danger/40'}`}>
                {cert.status === 'valid' ? <ShieldCheck className="size-8 shrink-0 text-success" /> : <ShieldAlert className="size-8 shrink-0 text-danger" />}
                <div>
                  <p className="text-lg font-semibold">{cert.status === 'valid' ? 'Valid certificate' : 'This certificate has been revoked'}</p>
                  <p className="text-sm text-muted">
                    Issued to <strong className="text-ink">{cert.studentName}</strong> for <strong className="text-ink">{cert.courseTitle}</strong> on {new Date(cert.issuedAt).toLocaleDateString(undefined, { dateStyle: 'long' })} by {cert.issuer}.
                  </p>
                  {cert.status === 'revoked' && <p className="mt-2 text-sm"><span className="font-medium">Reason:</span> {cert.revokedReason}</p>}
                </div>
                {cert.status === 'valid' && <BadgeCheck className="ml-auto hidden size-6 text-success sm:block" aria-hidden />}
              </div>
              <CertificateDocument cert={cert} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
