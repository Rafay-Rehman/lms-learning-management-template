import { PageHeader } from '@/components/ui/misc'
import { useTeachingCourses } from '@/state/selectors'
import { AnalyticsView } from './AnalyticsView'

export default function AnalyticsPage() {
  const courses = useTeachingCourses()
  return (
    <div>
      <PageHeader title="Learning Analytics" description="How students are progressing in your courses. Period figures use the selected date range; scores and pass rates are all-time." />
      <AnalyticsView courses={courses} />
    </div>
  )
}
