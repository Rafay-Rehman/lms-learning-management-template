import { Fragment, type ReactNode } from 'react'
import { Download, ExternalLink, FileText, Film, PlayCircle } from 'lucide-react'
import type { Lesson, Quiz } from '@/types'
import { ButtonLink } from '@/components/ui/Button'
import { isSafeUrl, videoSource } from '@/services/courses'

// Renders a lesson body by type. Text lessons use a tiny markdown subset
// (## headings, - bullets, **bold**, *italic*, `code`) rendered as React
// elements — never as HTML — so lesson text can't inject markup.

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index))
    const t = m[0]
    out.push(t.startsWith('**') ? <strong key={m.index}>{t.slice(2, -2)}</strong> : t.startsWith('`') ? <code key={m.index}>{t.slice(1, -1)}</code> : <em key={m.index}>{t.slice(1, -1)}</em>)
    last = m.index! + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className="prose-lesson text-ink">
      {blocks.map((b, i) => {
        const lines = b.split('\n')
        return (
          <Fragment key={i}>
            {lines[0].startsWith('## ') ? <h2>{inline(lines[0].slice(3))}</h2> : null}
            {(() => {
              const rest = lines[0].startsWith('## ') ? lines.slice(1) : lines
              if (!rest.length) return null
              if (rest.every((l) => l.startsWith('- '))) return <ul>{rest.map((l, k) => <li key={k}>{inline(l.slice(2))}</li>)}</ul>
              return <p>{inline(rest.join(' '))}</p>
            })()}
          </Fragment>
        )
      })}
    </div>
  )
}

export function VideoBlock({ lesson }: { lesson: Lesson }) {
  const src = videoSource(lesson.videoUrl)
  if (src?.kind === 'file') return <video src={src.src} controls className="aspect-video w-full rounded-[var(--radius)] bg-black" />
  if (src?.kind === 'embed')
    return <iframe src={src.src} title={lesson.title} className="aspect-video w-full rounded-[var(--radius)] bg-black" allow="encrypted-media; picture-in-picture; fullscreen" sandbox="allow-scripts allow-same-origin allow-presentation" />
  return (
    <div className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-[var(--radius)] bg-[linear-gradient(135deg,var(--nav),color-mix(in_oklab,var(--nav)_70%,var(--primary)))] text-white">
      <div className="px-6 text-center">
        <PlayCircle className="mx-auto size-14 opacity-90" strokeWidth={1.2} />
        <p className="mt-3 font-display text-lg font-semibold">{lesson.title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-white/75">
          Video placeholder · {lesson.durationMinutes} min. Add an MP4 link or a YouTube/Vimeo URL to this lesson in the course builder to play real media here.
        </p>
      </div>
      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium"><Film className="size-3.5" /> Demo media</span>
    </div>
  )
}

export function LessonContent({ lesson, quiz, quizAction }: { lesson: Lesson; quiz?: Quiz; quizAction?: ReactNode }) {
  switch (lesson.type) {
    case 'video':
      return (
        <div className="space-y-5">
          <VideoBlock lesson={lesson} />
          <p className="max-w-[68ch] text-muted">{lesson.summary || 'Watch the video, then use the notes panel to capture what you want to remember.'}</p>
        </div>
      )
    case 'text':
      return <RichText text={lesson.body || lesson.summary || 'This lesson has no text yet.'} />
    case 'pdf':
    case 'link': {
      const safe = isSafeUrl(lesson.url)
      const local = lesson.url.startsWith('/')
      return (
        <div className="panel flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <span className="grid size-14 shrink-0 place-items-center rounded-[var(--radius)] bg-primary-soft text-primary">{lesson.type === 'pdf' ? <FileText className="size-7" /> : <ExternalLink className="size-7" />}</span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{lesson.title}</p>
            <p className="text-sm text-muted">{lesson.type === 'pdf' ? 'Download the worksheet, complete it, then mark this lesson complete.' : 'This lesson uses an external resource. It opens in a new tab.'}</p>
            {!local && <p className="mt-1 truncate text-xs text-faint">{lesson.url}</p>}
          </div>
          {safe ? (
            <a href={lesson.url} target="_blank" rel="noopener noreferrer" download={lesson.type === 'pdf' && local ? '' : undefined} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--r-btn)] bg-primary px-3.5 text-sm font-medium text-primary-ink hover:bg-primary-strong">
              {lesson.type === 'pdf' ? <Download className="size-4" /> : <ExternalLink className="size-4" />}
              {lesson.type === 'pdf' ? 'Download PDF' : 'Open resource'}
            </a>
          ) : (
            <span className="text-sm text-danger">This link isn’t a safe http(s) address.</span>
          )}
        </div>
      )
    }
    case 'quiz':
      return (
        <div className="panel p-6">
          <p className="font-display text-xl font-semibold">{quiz?.title ?? 'Quiz'}</p>
          <p className="mt-1 max-w-[60ch] text-muted">{quiz?.description}</p>
          {quiz && (
            <dl className="mt-4 grid max-w-lg grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-faint">Questions</dt><dd className="font-medium tabular">{quiz.questions.length}</dd></div>
              <div><dt className="text-faint">Pass mark</dt><dd className="font-medium tabular">{quiz.passingScore}%</dd></div>
              <div><dt className="text-faint">Time</dt><dd className="font-medium">{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : 'Untimed'}</dd></div>
              <div><dt className="text-faint">Attempts</dt><dd className="font-medium">{quiz.maxAttempts ?? 'Unlimited'}</dd></div>
            </dl>
          )}
          <div className="mt-5">{quizAction ?? (quiz && <ButtonLink variant="primary" to={`/learn/quizzes/${quiz.id}`}>Open quiz</ButtonLink>)}</div>
        </div>
      )
  }
}
