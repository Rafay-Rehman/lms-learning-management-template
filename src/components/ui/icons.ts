import { BookOpen, Brain, Briefcase, Camera, ChartColumn, Code2, FlaskConical, Globe, Kanban, Languages, Megaphone, PenTool, Sigma, type LucideIcon } from 'lucide-react'

// Icons available for subjects and categories. Add a key here to offer it in the forms.
export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  code: Code2,
  globe: Globe,
  chart: ChartColumn,
  brain: Brain,
  sigma: Sigma,
  flask: FlaskConical,
  briefcase: Briefcase,
  megaphone: Megaphone,
  kanban: Kanban,
  pen: PenTool,
  book: BookOpen,
  languages: Languages,
  camera: Camera,
}

export const iconFor = (key: string): LucideIcon => SUBJECT_ICONS[key] ?? BookOpen
