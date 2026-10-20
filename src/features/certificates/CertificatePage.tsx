import { useParams } from 'react-router'
import { Copy, ExternalLink, Printer } from 'lucide-react'
import { NotFound } from '@/app/App'
import { Badge } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { useMe } from '@/state/selectors'
import { useStore } from '@/state/store'
import { CertificateDocument } from './CertificateDocument'

export default function CertificatePage() {
  const { id } = useParams()
  const { data } = useStore()
  const me = useMe()
  const toast = useToast()
  const cert = data.certificates.find((c) => c.id === id)
  if (!cert || (cert.userId !== me.id && me.role === 'student')) return <NotFound />
  const url = `${location.origin}/verify/${cert.code}`
  return (
    <div>
      <style>{'@page { size: landscape; margin: 8mm }'}</style>
      <div className="no-print">
        <PageHeader
          title={cert.courseTitle}
          description={<>Certificate {cert.code} · {cert.status === 'valid' ? <Badge color="var(--success)">Valid</Badge> : <Badge color="var(--danger)">Revoked</Badge>}</>}
          actions={
            <>
              <Button icon={<Copy />} onClick={() => navigator.clipboard?.writeText(url).then(() => toast('Verification link copied'), () => toast(url, { tone: 'info' }))}>Copy verification link</Button>
              <ButtonLink to={`/verify/${cert.code}`} icon={<ExternalLink />}>Open verification page</ButtonLink>
              <Button variant="primary" icon={<Printer />} onClick={() => print()}>Print / save as PDF</Button>
            </>
          }
        />
        {cert.status === 'revoked' && <p className="mb-4 rounded-[var(--r-ctl)] bg-danger/10 p-3 text-sm">Revoked: {cert.revokedReason}</p>}
        <p className="mb-4 text-xs text-faint">To save a PDF, choose “Save as PDF” as the printer in your browser’s print dialog. The layout is set to landscape.</p>
      </div>
      <CertificateDocument cert={cert} />
    </div>
  )
}
