import type { CourseStatus, Level, LessonType, QuestionType } from '@/types'

// Hand-written catalog content for the demo institution. seed.ts turns this
// into records, adds people and generates consistent progress history.

/** [type, title, minutes, body/quiz key, flags] — flags: 'optional' | 'preview' */
export type LessonSpec = [LessonType, string, number, string?, ('optional' | 'preview')[]?]

export interface CourseSpec {
  key: string
  title: string
  short: string
  description: string
  category: string
  subject: string | null
  instructor: string
  level: Level
  hours: number
  price: number
  status: CourseStatus
  certificate: boolean
  objectives: string[]
  prerequisites: string[]
  tags: string[]
  sections: [string, LessonSpec[]][]
  /** Resource files attached to the first lesson of the given section index. */
  resources?: [number, string, string, string][]
  /** How popular the course is in the generated enrollments (relative weight). */
  weight: number
}

export interface QuizSpec {
  key: string
  course: string
  kind: 'quiz' | 'exam'
  title: string
  description: string
  passing: number
  minutes: number | null
  attempts: number | null
  /** Due date offset in days from today, or null. */
  due: number | null
  review: 'after_submit' | 'after_pass' | 'never'
  questions: { type: QuestionType; text: string; options?: string[]; correct: (number | string)[]; points?: number; explanation: string; topic: string; difficulty: 'easy' | 'medium' | 'hard' }[]
}

export const CATEGORIES = [
  { id: 'cat-dev', name: 'Programming & Development', description: 'Write software, from first scripts to production web apps.', hue: 238, icon: 'code' },
  { id: 'cat-data', name: 'Data & AI', description: 'Analyse data, build models and communicate findings.', hue: 190, icon: 'chart' },
  { id: 'cat-math', name: 'Mathematics', description: 'Calculus, statistics and the reasoning behind them.', hue: 265, icon: 'sigma' },
  { id: 'cat-science', name: 'Life Sciences', description: 'Biology and the laboratory skills that support it.', hue: 150, icon: 'flask' },
  { id: 'cat-business', name: 'Business & Finance', description: 'Accounting, management and how organisations run.', hue: 32, icon: 'briefcase' },
  { id: 'cat-marketing', name: 'Marketing', description: 'Reach the right audience and measure what works.', hue: 345, icon: 'megaphone' },
  { id: 'cat-design', name: 'Design & Creative', description: 'Interface design, research and visual craft.', hue: 300, icon: 'pen' },
  { id: 'cat-lang', name: 'Languages & Writing', description: 'Write clearly, research well and learn new languages.', hue: 55, icon: 'book' },
]

export const SUBJECTS = [
  { id: 'sub-cs101', code: 'CS101', name: 'Programming Fundamentals', dept: 'dep-cs', cat: 'scat-stem', level: 'beginner', icon: 'code', status: 'active', instructors: ['u-reyes'], short: 'Core programming concepts: variables, control flow, functions and data structures.' },
  { id: 'sub-cs210', code: 'CS210', name: 'Web Development', dept: 'dep-cs', cat: 'scat-stem', level: 'intermediate', icon: 'globe', status: 'active', instructors: ['u-reyes'], short: 'Building interactive, accessible applications for the browser.' },
  { id: 'sub-data120', code: 'DATA120', name: 'Data Analysis', dept: 'dep-data', cat: 'scat-stem', level: 'beginner', icon: 'chart', status: 'active', instructors: ['u-okafor'], short: 'Cleaning, exploring and visualising real-world data sets.' },
  { id: 'sub-data310', code: 'DATA310', name: 'Machine Learning', dept: 'dep-data', cat: 'scat-stem', level: 'advanced', icon: 'brain', status: 'active', instructors: ['u-okafor'], short: 'Supervised and unsupervised learning, evaluation and deployment.' },
  { id: 'sub-math110', code: 'MATH110', name: 'Calculus', dept: 'dep-math', cat: 'scat-stem', level: 'beginner', icon: 'sigma', status: 'active', instructors: ['u-adeyemi'], short: 'Limits, derivatives and their applications.' },
  { id: 'sub-math140', code: 'MATH140', name: 'Statistics', dept: 'dep-math', cat: 'scat-stem', level: 'intermediate', icon: 'chart', status: 'active', instructors: ['u-adeyemi', 'u-okafor'], short: 'Probability, inference and statistical decision making.' },
  { id: 'sub-bio120', code: 'BIO120', name: 'Cell Biology', dept: 'dep-bio', cat: 'scat-stem', level: 'intermediate', icon: 'flask', status: 'active', instructors: ['u-lindqvist'], short: 'The structure, function and life cycle of cells.' },
  { id: 'sub-bus120', code: 'BUS120', name: 'Financial Accounting', dept: 'dep-bus', cat: 'scat-business', level: 'beginner', icon: 'briefcase', status: 'active', instructors: ['u-nowak'], short: 'Recording transactions and reading financial statements.' },
  { id: 'sub-bus150', code: 'BUS150', name: 'Digital Marketing', dept: 'dep-bus', cat: 'scat-business', level: 'intermediate', icon: 'megaphone', status: 'active', instructors: ['u-raman'], short: 'Channels, campaigns and measurement for online marketing.' },
  { id: 'sub-bus220', code: 'BUS220', name: 'Project Management', dept: 'dep-bus', cat: 'scat-professional', level: 'beginner', icon: 'kanban', status: 'active', instructors: ['u-nowak'], short: 'Planning, delivering and closing projects on time.' },
  { id: 'sub-des130', code: 'DES130', name: 'UX Design', dept: 'dep-design', cat: 'scat-creative', level: 'intermediate', icon: 'pen', status: 'active', instructors: ['u-chen'], short: 'Research-led interface and interaction design.' },
  { id: 'sub-lang110', code: 'LANG110', name: 'Academic Writing', dept: 'dep-lang', cat: 'scat-humanities', level: 'beginner', icon: 'book', status: 'active', instructors: ['u-raman'], short: 'Argument, structure, citation and revision.' },
  { id: 'sub-lang120', code: 'LANG120', name: 'Spanish Language', dept: 'dep-lang', cat: 'scat-humanities', level: 'beginner', icon: 'languages', status: 'draft', instructors: ['u-raman'], short: 'Spoken and written Spanish from A1.' },
  { id: 'sub-des160', code: 'DES160', name: 'Photography', dept: 'dep-design', cat: 'scat-creative', level: 'beginner', icon: 'camera', status: 'archived', instructors: ['u-chen'], short: 'Exposure, composition and the darkroom. Retired in 2026.' },
] as const

const T = (s: string) => s.trim().replace(/\n {2,}/g, '\n')

export const COURSES: CourseSpec[] = [
  {
    key: 'py-data',
    title: 'Python for Data Analysis',
    short: 'Load, clean, explore and chart real data sets with Python and pandas.',
    description: 'A practical first course in data analysis. You will work through three real public data sets — city bike trips, household energy use and a small retail ledger — and learn the habits analysts rely on: checking assumptions, cleaning carefully, and explaining what the numbers mean. By the end you will be comfortable taking a raw CSV to a short, well-argued report.',
    category: 'cat-data', subject: 'sub-data120', instructor: 'u-okafor', level: 'beginner', hours: 14, price: 0, status: 'published', certificate: true,
    objectives: ['Load CSV and Excel files into pandas DataFrames', 'Find and fix missing, duplicated and inconsistent values', 'Summarise data with grouping and pivot tables', 'Choose and build clear charts with matplotlib', 'Write a short analysis that answers a real question'],
    prerequisites: ['Comfort with basic Python syntax (variables, lists, loops)', 'A laptop that can run Jupyter or Google Colab'],
    tags: ['python', 'pandas', 'data cleaning', 'visualisation'],
    weight: 10,
    resources: [[0, 'Python & pandas cheat sheet', '/assets/resources/python-pandas-cheatsheet.pdf', '3 KB'], [2, 'Bike trips sample data (CSV)', '/assets/resources/bike-trips-sample.csv', '2 KB']],
    sections: [
      ['Getting set up', [
        ['video', 'Welcome and how this course works', 6, '', ['preview']],
        ['text', 'Installing Python, Jupyter and pandas', 12, T(`
          You can follow this course in two ways: on your own computer with Jupyter, or in the browser with Google Colab. Both work; Colab needs no installation, while a local setup is faster and works offline.

          ## Option 1: a local install
          Install a recent Python 3 release, then create a virtual environment for the course so its packages don't clash with anything else on your machine.
          - Create the environment: \`python -m venv .venv\`
          - Activate it, then install the tools: \`pip install pandas matplotlib jupyterlab\`
          - Start the notebook server with \`jupyter lab\`

          ## Option 2: Google Colab
          Open a new notebook at colab.research.google.com. pandas and matplotlib are already installed. Upload the course data files from the Resources panel each time you start a session.

          Whichever you choose, run \`import pandas as pd; pd.__version__\` in the first cell. If it prints a version number, you're ready.
        `)],
        ['link', 'Reference: the official pandas user guide', 5, 'https://pandas.pydata.org/docs/user_guide/index.html', ['optional']],
      ]],
      ['Loading and inspecting data', [
        ['video', 'DataFrames and Series in ten minutes', 14],
        ['text', 'Reading CSV files without surprises', 15, T(`
          Most analysis starts with \`pd.read_csv\`. It guesses a lot for you — separators, column types, missing values — and most of the time it guesses right. The trouble starts when it guesses wrong silently.

          ## Check three things every time
          - **Shape:** \`df.shape\` tells you rows and columns. Compare it with what you expected.
          - **Types:** \`df.dtypes\` shows whether a date column was read as text, or a price as an object because of a stray currency sign.
          - **Missing values:** \`df.isna().sum()\` counts gaps per column.

          ## Be explicit when it matters
          Pass \`parse_dates=["started_at"]\` so dates are real datetimes, and \`dtype={"station_id": "string"}\` so leading zeros in IDs survive. Being explicit costs one line and saves an afternoon of confusion later.
        `)],
        ['quiz', 'Check your understanding: loading data', 10, 'q-py-1'],
      ]],
      ['Cleaning and transforming', [
        ['video', 'Missing values: drop, fill or flag?', 16],
        ['text', 'Tidy data and why it matters', 14, T(`
          A data set is *tidy* when each variable is a column, each observation is a row, and each type of observational unit is a table. It sounds obvious, yet most real files break at least one of these rules — monthly totals spread across twelve columns, or two measurements packed into one cell.

          ## Reshaping with melt and pivot
          \`df.melt()\` turns wide data (one column per month) into long data (a month column and a value column). \`df.pivot_table()\` goes the other way and aggregates as it does so.

          Tidy data makes grouping, filtering and charting predictable. When a step feels awkward, check whether the data is tidy first.
        `)],
        ['video', 'Grouping, aggregating and pivot tables', 18],
        ['pdf', 'Worksheet: cleaning the energy data set', 20, '/assets/resources/energy-cleaning-worksheet.pdf'],
      ]],
      ['Visualising and reporting', [
        ['video', 'Choosing the right chart', 12],
        ['text', 'Writing up an analysis', 15, T(`
          A good analysis report answers one question clearly. Start with the answer, then show the evidence, then note the limits.

          ## A simple structure
          - **Question:** one sentence. "Did weekday bike usage recover after the bridge reopened?"
          - **Answer:** one or two sentences with the key number.
          - **Evidence:** one or two charts, each with a title that states the finding.
          - **Caveats:** what the data can't tell you, and what you'd check next.

          Resist the urge to include every chart you made. The reader trusts you more when you show the two that matter.
        `)],
        ['quiz', 'Final assessment', 25, 'q-py-final'],
      ]],
    ],
  },
  {
    key: 'ml-found',
    title: 'Machine Learning Foundations',
    short: 'Understand, train and evaluate the core supervised learning models.',
    description: 'A grounded introduction to machine learning with scikit-learn. Instead of treating models as black boxes, you will build intuition for what each algorithm assumes, how to evaluate it honestly, and how to tell when a model is not good enough to use.',
    category: 'cat-data', subject: 'sub-data310', instructor: 'u-okafor', level: 'intermediate', hours: 22, price: 129, status: 'published', certificate: true,
    objectives: ['Frame a problem as classification or regression', 'Split data correctly and avoid leakage', 'Train linear models, decision trees and ensembles', 'Evaluate with cross-validation and the right metric', 'Explain model behaviour to non-specialists'],
    prerequisites: ['Python for Data Analysis, or equivalent pandas experience', 'High-school algebra'],
    tags: ['machine learning', 'scikit-learn', 'model evaluation'],
    weight: 7,
    sections: [
      ['What learning means', [
        ['video', 'From rules to learned patterns', 11, '', ['preview']],
        ['text', 'Features, labels and the training loop', 14, T(`
          Every supervised learning problem has the same shape: examples described by **features**, each with a known **label**, and a model that learns to predict the label from the features.

          ## Choosing the target
          The label defines what the model optimises. Predicting "will this customer cancel in the next 30 days" is a different problem from "will this customer ever cancel", and it needs different data.

          Write the target down as a precise sentence before you write any code.
        `)],
      ]],
      ['Evaluating models honestly', [
        ['video', 'Train, validation and test splits', 15],
        ['video', 'Cross-validation in practice', 17],
        ['text', 'Data leakage: the silent failure', 12, T(`
          Leakage happens when information that wouldn't be available at prediction time sneaks into training. The model looks brilliant in testing and fails in production.

          ## Common sources
          - Scaling or imputing using statistics from the whole data set before splitting.
          - Features computed from the future, like "total purchases this year" for a prediction made in March.
          - Duplicate records appearing in both training and test sets.

          Put every preprocessing step inside a scikit-learn \`Pipeline\` so it is fitted on training folds only.
        `)],
        ['quiz', 'Quiz: evaluation and leakage', 12, 'q-ml-1'],
      ]],
      ['Core models', [
        ['video', 'Linear and logistic regression', 19],
        ['video', 'Decision trees and random forests', 21],
        ['video', 'Gradient boosting', 18, '', ['optional']],
      ]],
    ],
  },
  {
    key: 'js-ess',
    title: 'Modern JavaScript Essentials',
    short: 'The language features you need to read and write today’s JavaScript.',
    description: 'A compact tour of modern JavaScript for people who have written a little code before. You will learn the parts of the language that show up in every codebase — modules, destructuring, async/await, array methods — and the habits that keep code readable.',
    category: 'cat-dev', subject: 'sub-cs210', instructor: 'u-reyes', level: 'beginner', hours: 9, price: 0, status: 'published', certificate: true,
    objectives: ['Use let/const, arrow functions and template literals fluently', 'Work with arrays and objects using map, filter and destructuring', 'Write asynchronous code with promises and async/await', 'Organise code into ES modules'],
    prerequisites: ['Any prior programming experience'],
    tags: ['javascript', 'es modules', 'async'],
    weight: 9,
    resources: [[1, 'MDN: JavaScript guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', '']],
    sections: [
      ['Language basics, revisited', [
        ['video', 'Variables, scope and const', 9, '', ['preview']],
        ['text', 'Functions, arrows and this', 12, T(`
          Arrow functions are shorter, but the real difference is that they don't have their own \`this\`. They use the \`this\` of the surrounding code.

          ## When to use which
          - Use arrow functions for callbacks: \`items.map((item) => item.price)\`.
          - Use regular \`function\` declarations for named, top-level functions — they read well and are hoisted.
          - Use method shorthand in classes and objects when you need \`this\` to refer to the object.
        `)],
      ]],
      ['Working with data', [
        ['video', 'Array methods: map, filter, reduce', 14],
        ['video', 'Destructuring and spread', 10],
        ['quiz', 'Quiz: arrays and objects', 8, 'q-js-1'],
      ]],
      ['Asynchronous JavaScript', [
        ['video', 'Promises explained', 13],
        ['text', 'async/await and error handling', 12, T(`
          \`async\` functions always return a promise, and \`await\` pauses the function until a promise settles. That lets asynchronous code read top to bottom.

          ## Handle failures where you can act on them
          Wrap the awaited calls in \`try { … } catch (error) { … }\` at the level where you can show a message or retry — not around every single line.

          Run independent requests together with \`await Promise.all([a(), b()])\` instead of awaiting them one after another.
        `)],
        ['link', 'Exercise: fetch data from a public API', 20, 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch'],
      ]],
    ],
  },
  {
    key: 'react-apps',
    title: 'Building Web Apps with React',
    short: 'Components, state and data fetching — build a complete app step by step.',
    description: 'Build a reading-list app from an empty folder to a deployed, accessible product. Along the way you will learn how React thinks about components and state, how to structure a growing codebase, and how to test the parts that matter.',
    category: 'cat-dev', subject: 'sub-cs210', instructor: 'u-reyes', level: 'intermediate', hours: 18, price: 89, status: 'published', certificate: true,
    objectives: ['Compose interfaces from small, reusable components', 'Manage local and shared state', 'Fetch, cache and display remote data', 'Build accessible forms', 'Test components the way users use them'],
    prerequisites: ['Modern JavaScript Essentials, or equivalent', 'Basic HTML and CSS'],
    tags: ['react', 'components', 'accessibility', 'testing'],
    weight: 8,
    sections: [
      ['Thinking in components', [
        ['video', 'What React is for', 8, '', ['preview']],
        ['video', 'JSX and props', 14],
        ['text', 'Splitting a design into components', 12, T(`
          Start from a mockup and draw boxes around each part that has a single job. Each box becomes a component; boxes inside boxes become children.

          ## Where state lives
          For each piece of state, find every component that reads it, then put the state in their closest common parent. Pass it down as props, and pass callbacks down for changes.
        `)],
      ]],
      ['State and effects', [
        ['video', 'useState and events', 16],
        ['video', 'Effects and when not to use them', 15],
        ['quiz', 'Quiz: state and effects', 10, 'q-react-1'],
      ]],
      ['Shipping the app', [
        ['video', 'Accessible forms', 17],
        ['video', 'Testing with Testing Library', 18],
        ['video', 'Deploying to a static host', 9, '', ['optional']],
      ]],
    ],
  },
  {
    key: 'py-intro',
    title: 'Introduction to Programming with Python',
    short: 'Your first programming course. No experience needed.',
    description: 'Learn to think like a programmer using Python, one of the friendliest languages to start with. Short lessons and lots of small exercises take you from printing your first line to writing a working text-adventure game.',
    category: 'cat-dev', subject: 'sub-cs101', instructor: 'u-reyes', level: 'beginner', hours: 12, price: 0, status: 'published', certificate: true,
    objectives: ['Write and run Python programs', 'Use variables, conditions and loops', 'Break problems into functions', 'Work with lists and dictionaries'],
    prerequisites: ['None — this course starts from zero'],
    tags: ['python', 'beginner', 'programming'],
    weight: 9,
    sections: [
      ['First steps', [
        ['video', 'What programming is', 7, '', ['preview']],
        ['video', 'Your first program', 10],
        ['text', 'Variables and types', 12, T(`
          A variable is a name that refers to a value. \`score = 10\` creates the name \`score\` and points it at the number 10.

          ## The types you'll use most
          - \`int\` and \`float\` for whole and decimal numbers
          - \`str\` for text, written in quotes
          - \`bool\` for \`True\` and \`False\`

          Use \`type(value)\` whenever you're unsure what you're holding.
        `)],
      ]],
      ['Making decisions', [
        ['video', 'if, elif and else', 12],
        ['video', 'Loops with for and while', 14],
        ['quiz', 'Quiz: control flow', 8, 'q-pyintro-1'],
      ]],
      ['Organising code', [
        ['video', 'Writing functions', 15],
        ['video', 'Lists and dictionaries', 16],
        ['text', 'Project: a text adventure', 30, T(`
          Put everything together by building a small text adventure. Rooms are dictionaries, the player's inventory is a list, and each command is handled by its own function.

          ## Milestones
          - Describe three rooms and let the player move between them.
          - Add an item the player can pick up.
          - Lock one door until the player has the item.

          Share your finished game in the course discussion.
        `)],
      ]],
    ],
  },
  {
    key: 'ux-research',
    title: 'UX Research Methods',
    short: 'Plan, run and synthesise interviews, usability tests and surveys.',
    description: 'Good design decisions start with evidence. This course teaches the research methods product teams use every week, how to choose between them, and how to turn hours of notes into findings that change what gets built.',
    category: 'cat-design', subject: 'sub-des130', instructor: 'u-chen', level: 'intermediate', hours: 11, price: 79, status: 'published', certificate: true,
    objectives: ['Choose a research method for a question', 'Write a discussion guide and recruit participants', 'Run moderated usability tests', 'Synthesise findings with affinity mapping'],
    prerequisites: ['Interface Design Fundamentals is helpful but not required'],
    tags: ['ux', 'research', 'interviews', 'usability testing'],
    weight: 6,
    resources: [[1, 'Interview discussion guide template', '/assets/resources/ux-interview-guide.pdf', '3 KB']],
    sections: [
      ['Research foundations', [
        ['video', 'Why research, and when', 9, '', ['preview']],
        ['text', 'Matching methods to questions', 13, T(`
          The right method depends on what you need to learn. Ask whether your question is about **behaviour** (what people do) or **attitudes** (what people say), and whether you need **why** or **how many**.

          ## A quick guide
          - Why do people abandon checkout? Interviews and usability tests.
          - How many users use the export feature? Analytics.
          - Which of two labels is clearer? A preference or first-click test.
        `)],
      ]],
      ['Interviews', [
        ['video', 'Writing a discussion guide', 12],
        ['video', 'Asking without leading', 11],
        ['quiz', 'Quiz: interview technique', 8, 'q-ux-1'],
      ]],
      ['Usability testing and synthesis', [
        ['video', 'Running a moderated test', 15],
        ['video', 'Affinity mapping', 13],
        ['text', 'Presenting findings that land', 10, T(`
          Lead with the decision the team needs to make, then the evidence. Keep each finding to one sentence with a severity and a quote or clip.

          Teams act on three clear findings far more often than on thirty.
        `)],
      ]],
    ],
  },
  {
    key: 'ui-fund',
    title: 'Interface Design Fundamentals',
    short: 'Layout, type, colour and hierarchy for clear, usable screens.',
    description: 'Learn the visual principles behind interfaces that are easy to use. Through short critiques and redesign exercises, you will build an eye for hierarchy, spacing and contrast — and the vocabulary to explain your decisions.',
    category: 'cat-design', subject: 'sub-des130', instructor: 'u-chen', level: 'beginner', hours: 8, price: 0, status: 'published', certificate: true,
    objectives: ['Create clear visual hierarchy', 'Use a spacing scale and grid', 'Pair typefaces and set readable text', 'Choose accessible colour contrast'],
    prerequisites: ['None'],
    tags: ['ui', 'visual design', 'typography'],
    weight: 7,
    sections: [
      ['Hierarchy and layout', [
        ['video', 'What the eye sees first', 8, '', ['preview']],
        ['video', 'Spacing scales and grids', 12],
      ]],
      ['Type and colour', [
        ['video', 'Setting readable text', 11],
        ['text', 'Colour contrast and accessibility', 10, T(`
          WCAG asks for a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text and interface controls.

          ## Practical habits
          - Check contrast while you choose colours, not at the end.
          - Never use colour alone to show status — add a label or an icon.
          - Test your palette in dark mode separately; it rarely works by inversion.
        `)],
        ['quiz', 'Quiz: type and colour', 8, 'q-ui-1'],
      ]],
    ],
  },
  {
    key: 'cell-bio',
    title: 'Cell Biology: Structure and Function',
    short: 'Membranes, organelles and the cell cycle, with lab-skill primers.',
    description: 'An introduction to the cell as the unit of life. You will study how membranes control what enters and leaves, how organelles divide the work, and how cells grow and divide — with short primers on microscopy and staining for the lab.',
    category: 'cat-science', subject: 'sub-bio120', instructor: 'u-lindqvist', level: 'intermediate', hours: 16, price: 0, status: 'published', certificate: true,
    objectives: ['Describe membrane structure and transport', 'Explain the roles of the major organelles', 'Outline the stages of the cell cycle', 'Prepare and interpret a stained slide'],
    prerequisites: ['Secondary-school biology and chemistry'],
    tags: ['biology', 'cells', 'microscopy'],
    weight: 5,
    sections: [
      ['Membranes', [
        ['video', 'The fluid mosaic model', 13, '', ['preview']],
        ['video', 'Passive and active transport', 15],
      ]],
      ['Organelles', [
        ['video', 'The nucleus and gene expression', 14],
        ['video', 'Mitochondria and energy', 12],
        ['text', 'The endomembrane system', 12, T(`
          Proteins destined for secretion or for membranes are made on ribosomes attached to the rough endoplasmic reticulum, folded in its lumen, and shipped in vesicles to the Golgi apparatus.

          ## The Golgi as a sorting office
          In the Golgi, proteins are modified — often by adding sugar groups — and sorted into vesicles bound for the plasma membrane, lysosomes, or secretion outside the cell.
        `)],
      ]],
      ['Growth and division', [
        ['video', 'The cell cycle and checkpoints', 16],
        ['video', 'Mitosis step by step', 14],
        ['video', 'Lab primer: staining and microscopy', 18, '', ['optional']],
      ]],
    ],
  },
  {
    key: 'calc-1',
    title: 'Calculus I: Limits and Derivatives',
    short: 'Build intuition for change and learn to differentiate with confidence.',
    description: 'Calculus is the mathematics of change. This course develops the idea of a limit carefully, uses it to define the derivative, and then applies derivatives to rates of change, optimisation and curve sketching.',
    category: 'cat-math', subject: 'sub-math110', instructor: 'u-adeyemi', level: 'beginner', hours: 20, price: 0, status: 'published', certificate: true,
    objectives: ['Evaluate limits graphically and algebraically', 'Differentiate polynomial, exponential and trigonometric functions', 'Apply the chain, product and quotient rules', 'Solve optimisation problems'],
    prerequisites: ['Algebra and functions', 'Basic trigonometry'],
    tags: ['calculus', 'derivatives', 'limits'],
    weight: 6,
    sections: [
      ['Limits', [
        ['video', 'The idea of a limit', 14, '', ['preview']],
        ['video', 'Computing limits algebraically', 16],
        ['quiz', 'Quiz: limits', 12, 'q-calc-1'],
      ]],
      ['The derivative', [
        ['video', 'Derivative as a rate of change', 15],
        ['video', 'Differentiation rules', 18],
        ['video', 'The chain rule', 17],
      ]],
      ['Applications', [
        ['video', 'Optimisation problems', 20],
        ['video', 'Curve sketching', 18],
      ]],
    ],
  },
  {
    key: 'stats',
    title: 'Statistics for Decision Making',
    short: 'Use data and probability to make — and defend — better decisions.',
    description: 'Learn to reason with uncertainty. Starting from descriptive statistics and probability, you will build up to confidence intervals, hypothesis tests and A/B testing, always asking what a result actually means for the decision at hand.',
    category: 'cat-math', subject: 'sub-math140', instructor: 'u-adeyemi', level: 'intermediate', hours: 15, price: 59, status: 'published', certificate: true,
    objectives: ['Summarise data with appropriate statistics', 'Calculate and interpret probabilities', 'Build and interpret confidence intervals', 'Design and analyse a simple A/B test'],
    prerequisites: ['Comfort with algebra'],
    tags: ['statistics', 'probability', 'a/b testing'],
    weight: 6,
    resources: [[0, 'Statistics formula sheet', '/assets/resources/statistics-formula-sheet.pdf', '3 KB']],
    sections: [
      ['Describing data', [
        ['video', 'Centre and spread', 12, '', ['preview']],
        ['video', 'Distributions and outliers', 13],
      ]],
      ['Probability', [
        ['video', 'Probability rules', 15],
        ['video', 'The normal distribution', 14],
        ['quiz', 'Quiz: probability', 10, 'q-stats-1'],
      ]],
      ['Inference', [
        ['video', 'Confidence intervals', 16],
        ['video', 'Hypothesis testing', 18],
        ['text', 'A/B tests in practice', 14, T(`
          An A/B test randomly splits users between two versions and compares an outcome. Randomisation is what lets you say the difference was caused by the change.

          ## Decide before you look
          Fix the metric, the minimum effect worth detecting and the sample size before the test starts. Stopping as soon as the result looks significant inflates false positives.
        `)],
        ['quiz', 'Midterm exam', 30, 'q-stats-exam'],
      ]],
    ],
  },
  {
    key: 'fin-acct',
    title: 'Financial Accounting Basics',
    short: 'Read a balance sheet, record transactions and understand cash flow.',
    description: 'Understand the language of business. You will learn double-entry bookkeeping, build the three core financial statements from a small company’s ledger, and use simple ratios to judge how a business is doing.',
    category: 'cat-business', subject: 'sub-bus120', instructor: 'u-nowak', level: 'beginner', hours: 10, price: 49, status: 'published', certificate: true,
    objectives: ['Record transactions with double entry', 'Prepare an income statement and balance sheet', 'Explain the difference between profit and cash', 'Calculate common financial ratios'],
    prerequisites: ['None'],
    tags: ['accounting', 'finance', 'bookkeeping'],
    weight: 5,
    resources: [[0, 'Accounting terms glossary', '/assets/resources/accounting-glossary.pdf', '3 KB']],
    sections: [
      ['The accounting equation', [
        ['video', 'Assets, liabilities and equity', 11, '', ['preview']],
        ['video', 'Debits and credits', 14],
      ]],
      ['Financial statements', [
        ['video', 'The income statement', 13],
        ['video', 'The balance sheet', 13],
        ['text', 'Profit is not cash', 10, T(`
          A business can be profitable on paper and still run out of money. Revenue is recorded when it is earned, not when the customer pays, and large purchases are expensed gradually through depreciation.

          The cash flow statement reconciles profit with the actual change in the bank balance. Read it alongside the income statement every time.
        `)],
      ]],
    ],
  },
  {
    key: 'pm-ess',
    title: 'Project Management Essentials',
    short: 'Plan, run and close projects with clear scope, schedules and risks.',
    description: 'A practical course for anyone who runs projects, with or without the title. You will scope work, build a realistic schedule, manage risks and stakeholders, and close projects in a way that teaches the team something.',
    category: 'cat-business', subject: 'sub-bus220', instructor: 'u-nowak', level: 'beginner', hours: 7, price: 0, status: 'published', certificate: false,
    objectives: ['Write a clear project charter', 'Break work into a schedule with dependencies', 'Maintain a risk register', 'Run a useful retrospective'],
    prerequisites: ['None'],
    tags: ['project management', 'planning', 'agile'],
    weight: 5,
    sections: [
      ['Starting well', [
        ['video', 'What makes a project', 7, '', ['preview']],
        ['text', 'Writing a project charter', 10, T(`
          A charter is a one-page agreement on why the project exists, what it will deliver, and how you'll know it worked.

          ## Include
          - The problem and the outcome, in plain language
          - What is explicitly out of scope
          - Key dates, budget and the decision-maker
        `)],
      ]],
      ['Planning and delivery', [
        ['video', 'Work breakdown and estimates', 13],
        ['video', 'Managing risks', 11],
        ['video', 'Retrospectives that change things', 9],
      ]],
    ],
  },
  {
    key: 'dig-mkt',
    title: 'Digital Marketing Strategy',
    short: 'Plan campaigns across search, social and email — and measure them.',
    description: 'Move beyond tactics to strategy. You will define an audience and positioning, choose channels that fit, plan a campaign calendar, and set up measurement so you can tell which work actually drove results.',
    category: 'cat-marketing', subject: 'sub-bus150', instructor: 'u-raman', level: 'intermediate', hours: 13, price: 99, status: 'published', certificate: true,
    objectives: ['Define audience segments and positioning', 'Choose channels based on goals and budget', 'Plan an integrated campaign', 'Measure performance with sensible metrics'],
    prerequisites: ['Basic familiarity with social media and email marketing'],
    tags: ['marketing', 'strategy', 'analytics', 'campaigns'],
    weight: 6,
    sections: [
      ['Audience and positioning', [
        ['video', 'Segments and personas', 12, '', ['preview']],
        ['video', 'Positioning statements', 10],
      ]],
      ['Channels', [
        ['video', 'Search: SEO and paid', 16],
        ['video', 'Social media', 14],
        ['video', 'Email and lifecycle', 13],
        ['quiz', 'Quiz: channel strategy', 10, 'q-mkt-1'],
      ]],
      ['Measurement', [
        ['video', 'Metrics that matter', 12],
        ['text', 'Attribution without fooling yourself', 12, T(`
          Last-click attribution gives all the credit to the final touch before a conversion, which over-rewards search and under-rewards the channels that created demand in the first place.

          Compare several models, and where you can, run holdout tests: pause a channel for a random slice of the audience and measure what changes.
        `)],
      ]],
    ],
  },
  {
    key: 'acad-write',
    title: 'Academic Writing and Research',
    short: 'Structure arguments, use sources well and revise with purpose.',
    description: 'Write essays and reports that are clear, well-argued and properly sourced. You will practise building a thesis, organising evidence, quoting and paraphrasing responsibly, and revising drafts — your own and your peers’.',
    category: 'cat-lang', subject: 'sub-lang110', instructor: 'u-raman', level: 'beginner', hours: 9, price: 0, status: 'published', certificate: true,
    objectives: ['Write a focused thesis statement', 'Organise paragraphs around claims and evidence', 'Cite sources correctly and avoid plagiarism', 'Revise for clarity and concision'],
    prerequisites: ['None'],
    tags: ['writing', 'research', 'citation'],
    weight: 5,
    sections: [
      ['Arguments', [
        ['video', 'What makes a good thesis', 9, '', ['preview']],
        ['text', 'Claims, evidence and reasoning', 12, T(`
          Each body paragraph should make one claim, support it with evidence, and explain how the evidence supports the claim. That last step — the reasoning — is the one most often missing.

          Read each paragraph and ask: if I removed the explanation, would a sceptical reader be convinced? If not, the reasoning needs to be on the page.
        `)],
      ]],
      ['Sources', [
        ['video', 'Finding credible sources', 11],
        ['video', 'Quoting, paraphrasing and citing', 13],
        ['link', 'Guide: avoiding plagiarism', 8, 'https://owl.purdue.edu/owl/avoiding_plagiarism/index.html', ['optional']],
      ]],
      ['Revision', [
        ['video', 'Revising in passes', 10],
      ]],
    ],
  },
  {
    key: 'deep-learn',
    title: 'Deep Learning with PyTorch',
    short: 'Neural networks from tensors to training loops and fine-tuning.',
    description: 'Build and train neural networks with PyTorch. Starting with tensors and automatic differentiation, you will write your own training loops, train convolutional networks for images, and fine-tune a pretrained model.',
    category: 'cat-data', subject: 'sub-data310', instructor: 'u-okafor', level: 'advanced', hours: 26, price: 149, status: 'review', certificate: true,
    objectives: ['Work with tensors and autograd', 'Write training and evaluation loops', 'Train convolutional networks', 'Fine-tune a pretrained model'],
    prerequisites: ['Machine Learning Foundations', 'Linear algebra basics'],
    tags: ['deep learning', 'pytorch', 'neural networks'],
    weight: 0,
    sections: [
      ['Tensors and autograd', [
        ['video', 'Tensors in PyTorch', 15, '', ['preview']],
        ['video', 'Automatic differentiation', 16],
      ]],
      ['Training networks', [
        ['video', 'Your first training loop', 20],
        ['video', 'Convolutional networks', 22],
        ['video', 'Fine-tuning pretrained models', 19],
      ]],
    ],
  },
  {
    key: 'spanish-a1',
    title: 'Conversational Spanish A1',
    short: 'Introduce yourself, order food and get around in Spanish.',
    description: 'A friendly first step into Spanish focused on speaking and listening. Each unit is built around a real situation — meeting people, ordering in a café, asking for directions.',
    category: 'cat-lang', subject: 'sub-lang120', instructor: 'u-raman', level: 'beginner', hours: 12, price: 39, status: 'draft', certificate: true,
    objectives: ['Introduce yourself and others', 'Order food and drink', 'Ask for and follow directions'],
    prerequisites: ['None'],
    tags: ['spanish', 'languages', 'speaking'],
    weight: 0,
    sections: [
      ['Unidad 1: Hola', [
        ['video', 'Greetings and introductions', 10, '', ['preview']],
        ['video', 'Numbers 1–20', 9],
      ]],
    ],
  },
  {
    key: 'film-photo',
    title: 'Film Photography Basics',
    short: 'Exposure, composition and developing your first roll.',
    description: 'Learn to shoot and develop black-and-white film. This course was retired when the darkroom closed; enrolled students keep access to the material.',
    category: 'cat-design', subject: 'sub-des160', instructor: 'u-chen', level: 'beginner', hours: 8, price: 0, status: 'archived', certificate: true,
    objectives: ['Meter and expose film correctly', 'Compose with intention', 'Develop and scan a roll of film'],
    prerequisites: ['Access to a film camera'],
    tags: ['photography', 'film'],
    weight: 3,
    sections: [
      ['Exposure', [
        ['video', 'The exposure triangle', 12, '', ['preview']],
        ['video', 'Metering', 11],
      ]],
      ['Darkroom', [
        ['video', 'Developing a roll', 18],
      ]],
    ],
  },
]

export const QUIZZES: QuizSpec[] = [
  {
    key: 'q-py-1', course: 'py-data', kind: 'quiz', title: 'Check your understanding: loading data', description: 'Five questions on reading and inspecting data with pandas.', passing: 70, minutes: null, attempts: 3, due: null, review: 'after_submit',
    questions: [
      { type: 'single', text: 'Which pandas attribute tells you the number of rows and columns in a DataFrame?', options: ['df.size', 'df.shape', 'df.columns', 'df.info'], correct: [1], explanation: '`df.shape` returns a (rows, columns) tuple. `df.size` is the total number of cells.', topic: 'Inspecting data', difficulty: 'easy' },
      { type: 'multiple', text: 'Which checks should you run straight after loading a CSV? Select all that apply.', options: ['Look at the column types', 'Count missing values', 'Train a model', 'Compare the shape with what you expected'], correct: [0, 1, 3], explanation: 'Types, missing values and shape catch most loading problems early. Modelling comes much later.', topic: 'Inspecting data', difficulty: 'medium' },
      { type: 'true_false', text: 'By default, pd.read_csv converts date columns into datetime values.', options: ['True', 'False'], correct: [1], explanation: 'Dates are read as text unless you pass `parse_dates`.', topic: 'Reading files', difficulty: 'medium' },
      { type: 'short', text: 'Which read_csv argument keeps leading zeros in an ID column? (Name the argument.)', correct: ['dtype'], explanation: 'Passing `dtype={"station_id": "string"}` stops pandas converting the IDs to numbers.', topic: 'Reading files', difficulty: 'hard' },
      { type: 'single', text: 'What does df.isna().sum() return?', options: ['The total of all numeric columns', 'The number of missing values in each column', 'Rows that contain missing values', 'A copy with missing values removed'], correct: [1], explanation: '`isna()` marks missing cells as True, and `sum()` counts them per column.', topic: 'Missing values', difficulty: 'easy' },
    ],
  },
  {
    key: 'q-py-final', course: 'py-data', kind: 'exam', title: 'Python for Data Analysis — final assessment', description: 'Covers the whole course. Includes one written question graded by your instructor.', passing: 65, minutes: 30, attempts: 2, due: 6, review: 'after_pass',
    questions: [
      { type: 'single', text: 'Data with one column per month is best reshaped for grouping with…', options: ['df.pivot_table()', 'df.melt()', 'df.dropna()', 'df.merge()'], correct: [1], explanation: '`melt` turns wide data into long, tidy data.', topic: 'Tidy data', difficulty: 'medium' },
      { type: 'multiple', text: 'Which are valid ways to handle missing values? Select all that apply.', options: ['Drop the affected rows', 'Fill with a sensible value', 'Add a flag column and keep them', 'Ignore them and hope'], correct: [0, 1, 2], explanation: 'Dropping, filling and flagging are all legitimate — the right choice depends on why the data is missing.', topic: 'Missing values', difficulty: 'medium' },
      { type: 'true_false', text: 'A chart title should describe the finding, not just the variables.', options: ['True', 'False'], correct: [0], explanation: 'A title like “Weekday trips recovered by June” tells the reader what to see.', topic: 'Reporting', difficulty: 'easy' },
      { type: 'single', text: 'Which method aggregates rows that share a key?', options: ['df.groupby()', 'df.sort_values()', 'df.head()', 'df.rename()'], correct: [0], explanation: '`groupby` splits rows by key so you can aggregate each group.', topic: 'Aggregation', difficulty: 'easy' },
      { type: 'short', text: 'In two or three sentences, explain why you would start an analysis report with the answer rather than the method.', correct: [], points: 4, explanation: 'Readers want the conclusion first; leading with the answer lets them judge the evidence that follows.', topic: 'Reporting', difficulty: 'medium' },
    ],
  },
  {
    key: 'q-ml-1', course: 'ml-found', kind: 'quiz', title: 'Quiz: evaluation and leakage', description: 'How to evaluate models without fooling yourself.', passing: 75, minutes: 15, attempts: 2, due: 10, review: 'after_submit',
    questions: [
      { type: 'single', text: 'Why should scaling be fitted inside a cross-validation pipeline?', options: ['It runs faster', 'To avoid leaking statistics from the validation folds', 'Scaling is required by every model', 'It improves accuracy on the training set'], correct: [1], explanation: 'Fitting on all data leaks information about the validation folds into training.', topic: 'Leakage', difficulty: 'medium' },
      { type: 'true_false', text: 'A model that scores 99% on its training data will generalise well.', options: ['True', 'False'], correct: [1], explanation: 'High training accuracy can mean overfitting. Only held-out data tells you about generalisation.', topic: 'Evaluation', difficulty: 'easy' },
      { type: 'multiple', text: 'Which of these can cause data leakage?', options: ['Duplicate rows in train and test', 'Features computed from future information', 'Using a random seed', 'Imputing with the overall mean before splitting'], correct: [0, 1, 3], explanation: 'Random seeds only control reproducibility; the others leak information.', topic: 'Leakage', difficulty: 'hard' },
      { type: 'single', text: 'For a rare-event classifier (1% positives), which metric is most informative?', options: ['Accuracy', 'Precision and recall', 'Mean squared error', 'R²'], correct: [1], explanation: 'Accuracy is 99% for a model that always says “no”. Precision and recall show performance on the rare class.', topic: 'Metrics', difficulty: 'medium' },
    ],
  },
  {
    key: 'q-js-1', course: 'js-ess', kind: 'quiz', title: 'Quiz: arrays and objects', description: 'Array methods, destructuring and spread.', passing: 70, minutes: null, attempts: null, due: null, review: 'after_submit',
    questions: [
      { type: 'single', text: 'What does [1, 2, 3].map((n) => n * 2) return?', options: ['[2, 4, 6]', '6', '[1, 2, 3]', 'undefined'], correct: [0], explanation: '`map` returns a new array with each element transformed.', topic: 'Array methods', difficulty: 'easy' },
      { type: 'single', text: 'Which method returns only the elements that pass a test?', options: ['find', 'filter', 'some', 'reduce'], correct: [1], explanation: '`filter` returns all matching elements; `find` returns the first.', topic: 'Array methods', difficulty: 'easy' },
      { type: 'true_false', text: 'The spread syntax {...a} creates a deep copy of nested objects.', options: ['True', 'False'], correct: [1], explanation: 'Spread is shallow: nested objects are still shared.', topic: 'Spread', difficulty: 'medium' },
      { type: 'short', text: 'Which keyword declares a variable that cannot be reassigned?', correct: ['const'], explanation: '`const` prevents reassignment (but not mutation of objects).', topic: 'Variables', difficulty: 'easy' },
    ],
  },
  {
    key: 'q-react-1', course: 'react-apps', kind: 'quiz', title: 'Quiz: state and effects', description: 'Where state lives and when effects are needed.', passing: 70, minutes: 10, attempts: 3, due: 14, review: 'after_submit',
    questions: [
      { type: 'single', text: 'Two sibling components need the same state. Where should it live?', options: ['In both siblings', 'In their closest common parent', 'In a global variable', 'In localStorage'], correct: [1], explanation: 'Lift state to the closest common parent and pass it down.', topic: 'State', difficulty: 'easy' },
      { type: 'true_false', text: 'You need an effect to compute a value from props during render.', options: ['True', 'False'], correct: [1], explanation: 'Derived values should be calculated during render, not synchronised with an effect.', topic: 'Effects', difficulty: 'medium' },
      { type: 'multiple', text: 'Which are good uses of useEffect?', options: ['Subscribing to a browser event', 'Filtering a list for display', 'Connecting to a chat server', 'Formatting a date'], correct: [0, 2], explanation: 'Effects synchronise with external systems. Filtering and formatting belong in render.', topic: 'Effects', difficulty: 'medium' },
    ],
  },
  {
    key: 'q-pyintro-1', course: 'py-intro', kind: 'quiz', title: 'Quiz: control flow', description: 'Conditions and loops.', passing: 60, minutes: null, attempts: null, due: null, review: 'after_submit',
    questions: [
      { type: 'single', text: 'How many times does `for i in range(3):` loop?', options: ['2', '3', '4', 'Forever'], correct: [1], explanation: '`range(3)` yields 0, 1 and 2.', topic: 'Loops', difficulty: 'easy' },
      { type: 'true_false', text: 'In Python, indentation determines which lines belong to an if block.', options: ['True', 'False'], correct: [0], explanation: 'Python uses indentation instead of braces.', topic: 'Conditions', difficulty: 'easy' },
      { type: 'single', text: 'Which keyword checks another condition after an if?', options: ['else if', 'elif', 'elseif', 'then'], correct: [1], explanation: 'Python uses `elif`.', topic: 'Conditions', difficulty: 'easy' },
    ],
  },
  {
    key: 'q-ux-1', course: 'ux-research', kind: 'quiz', title: 'Quiz: interview technique', description: 'Asking good questions.', passing: 75, minutes: null, attempts: 2, due: 3, review: 'after_submit',
    questions: [
      { type: 'single', text: 'Which question is least leading?', options: ['Don’t you find checkout confusing?', 'How easy was checkout?', 'Tell me about the last time you bought something online.', 'Would you like a faster checkout?'], correct: [2], explanation: 'Open, past-behaviour questions avoid suggesting an answer.', topic: 'Interviews', difficulty: 'medium' },
      { type: 'true_false', text: 'Interviews are the best way to measure how many users use a feature.', options: ['True', 'False'], correct: [1], explanation: 'Counting usage is a job for analytics, not interviews.', topic: 'Methods', difficulty: 'easy' },
      { type: 'multiple', text: 'Which belong in a discussion guide?', options: ['Warm-up questions', 'The research goals', 'Leading questions to confirm the design', 'Follow-up prompts'], correct: [0, 1, 3], explanation: 'Guides set goals and structure; they should never script leading questions.', topic: 'Interviews', difficulty: 'medium' },
    ],
  },
  {
    key: 'q-ui-1', course: 'ui-fund', kind: 'quiz', title: 'Quiz: type and colour', description: 'Readable text and accessible colour.', passing: 70, minutes: null, attempts: null, due: null, review: 'after_submit',
    questions: [
      { type: 'single', text: 'What is the minimum WCAG AA contrast ratio for normal body text?', options: ['3:1', '4.5:1', '7:1', '2:1'], correct: [1], explanation: 'AA requires 4.5:1 for normal text and 3:1 for large text.', topic: 'Contrast', difficulty: 'easy' },
      { type: 'true_false', text: 'Using only red and green to show status is accessible.', options: ['True', 'False'], correct: [1], explanation: 'Colour alone fails users with colour-vision deficiencies; add labels or icons.', topic: 'Accessibility', difficulty: 'easy' },
    ],
  },
  {
    key: 'q-calc-1', course: 'calc-1', kind: 'quiz', title: 'Quiz: limits', description: 'Evaluating limits.', passing: 70, minutes: 20, attempts: 3, due: 9, review: 'after_submit',
    questions: [
      { type: 'single', text: 'What is the limit of (x² − 1)/(x − 1) as x → 1?', options: ['0', '1', '2', 'It does not exist'], correct: [2], explanation: 'Factor to (x + 1)(x − 1)/(x − 1) = x + 1, which approaches 2.', topic: 'Limits', difficulty: 'medium' },
      { type: 'true_false', text: 'If a function is undefined at a point, its limit there cannot exist.', options: ['True', 'False'], correct: [1], explanation: 'A limit describes behaviour near the point, not at it.', topic: 'Limits', difficulty: 'medium' },
      { type: 'short', text: 'What is the limit of 1/x as x → ∞? (Enter a number.)', correct: ['0'], explanation: '1/x gets arbitrarily close to 0.', topic: 'Limits at infinity', difficulty: 'easy' },
    ],
  },
  {
    key: 'q-stats-1', course: 'stats', kind: 'quiz', title: 'Quiz: probability', description: 'Probability rules and the normal distribution.', passing: 70, minutes: 15, attempts: 2, due: null, review: 'after_submit',
    questions: [
      { type: 'single', text: 'Two fair coins are tossed. What is the probability of two heads?', options: ['1/2', '1/3', '1/4', '1/8'], correct: [2], explanation: '1/2 × 1/2 = 1/4.', topic: 'Probability rules', difficulty: 'easy' },
      { type: 'single', text: 'About what share of a normal distribution lies within one standard deviation of the mean?', options: ['50%', '68%', '95%', '99.7%'], correct: [1], explanation: 'The 68–95–99.7 rule.', topic: 'Normal distribution', difficulty: 'easy' },
      { type: 'true_false', text: 'Independent events can also be mutually exclusive if both have non-zero probability.', options: ['True', 'False'], correct: [1], explanation: 'If they were mutually exclusive, one happening would change the other’s probability to zero.', topic: 'Probability rules', difficulty: 'hard' },
    ],
  },
  {
    key: 'q-stats-exam', course: 'stats', kind: 'exam', title: 'Statistics midterm exam', description: 'Covers describing data, probability and inference.', passing: 60, minutes: 40, attempts: 1, due: 12, review: 'after_submit',
    questions: [
      { type: 'single', text: 'A 95% confidence interval means…', options: ['There is a 95% chance the true value is in this interval', 'The method captures the true value in 95% of repeated samples', '95% of the data lies in the interval', 'The result is 95% accurate'], correct: [1], explanation: 'Confidence describes the long-run behaviour of the method.', topic: 'Confidence intervals', difficulty: 'hard' },
      { type: 'single', text: 'Which summary is most robust to outliers?', options: ['Mean', 'Median', 'Range', 'Standard deviation'], correct: [1], explanation: 'The median depends only on the middle value(s).', topic: 'Descriptive statistics', difficulty: 'easy' },
      { type: 'multiple', text: 'Which practices protect an A/B test from false positives?', options: ['Fixing the sample size in advance', 'Stopping when the p-value first dips below 0.05', 'Choosing one primary metric', 'Randomising assignment'], correct: [0, 2, 3], explanation: 'Peeking and stopping early inflates the false-positive rate.', topic: 'A/B testing', difficulty: 'medium' },
      { type: 'short', text: 'Briefly explain the difference between statistical and practical significance.', correct: [], points: 3, explanation: 'Statistical significance says an effect is unlikely to be chance; practical significance asks whether it is large enough to matter.', topic: 'Inference', difficulty: 'medium' },
    ],
  },
  {
    key: 'q-mkt-1', course: 'dig-mkt', kind: 'quiz', title: 'Quiz: channel strategy', description: 'Choosing channels for goals.', passing: 70, minutes: null, attempts: 3, due: null, review: 'after_submit',
    questions: [
      { type: 'single', text: 'Which channel best captures existing demand?', options: ['Paid search', 'Display banners', 'Podcast sponsorship', 'Billboards'], correct: [0], explanation: 'Search reaches people already looking for a solution.', topic: 'Channels', difficulty: 'easy' },
      { type: 'true_false', text: 'Email lists are an owned channel.', options: ['True', 'False'], correct: [0], explanation: 'You control the list and the message, unlike social platforms.', topic: 'Channels', difficulty: 'easy' },
      { type: 'multiple', text: 'Which are signs of a vanity metric?', options: ['It always goes up', 'It doesn’t inform a decision', 'It is tied to revenue', 'It is easy to inflate'], correct: [0, 1, 3], explanation: 'Useful metrics change decisions and are hard to game.', topic: 'Measurement', difficulty: 'medium' },
    ],
  },
]

export const EXTRA_BANK = [
  { subject: 'sub-data120', course: 'py-data', type: 'single' as const, text: 'Which function joins two DataFrames on a shared key?', options: ['pd.concat', 'pd.merge', 'df.append', 'df.join_all'], correct: [1], explanation: '`pd.merge` performs SQL-style joins on key columns.', topic: 'Combining data', difficulty: 'medium' as const, tags: ['pandas', 'joins'] },
  { subject: 'sub-math110', course: 'calc-1', type: 'short' as const, text: 'What is the derivative of x³? (Use ^ for powers.)', options: [], correct: ['3x^2', '3x²'], explanation: 'Power rule: d/dx xⁿ = n·xⁿ⁻¹.', topic: 'Differentiation rules', difficulty: 'easy' as const, tags: ['power rule'] },
  { subject: 'sub-bus120', course: 'fin-acct', type: 'single' as const, text: 'Which statement shows a company’s position at a single point in time?', options: ['Income statement', 'Balance sheet', 'Cash flow statement', 'Budget'], correct: [1], explanation: 'The balance sheet is a snapshot; the others cover a period.', topic: 'Financial statements', difficulty: 'easy' as const, tags: ['statements'] },
  { subject: 'sub-bio120', course: 'cell-bio', type: 'true_false' as const, text: 'Mitochondria contain their own DNA.', options: ['True', 'False'], correct: [0], explanation: 'Mitochondrial DNA is inherited maternally and encodes some respiratory proteins.', topic: 'Organelles', difficulty: 'medium' as const, tags: ['mitochondria'] },
  { subject: 'sub-bio120', course: 'cell-bio', type: 'multiple' as const, text: 'Which are forms of passive transport?', options: ['Diffusion', 'Osmosis', 'Sodium–potassium pump', 'Facilitated diffusion'], correct: [0, 1, 3], explanation: 'The pump uses ATP, so it is active transport.', topic: 'Membrane transport', difficulty: 'medium' as const, tags: ['membranes'] },
  { subject: 'sub-des130', course: 'ux-research', type: 'single' as const, text: 'How many participants typically surface most usability issues in a round of testing?', options: ['1–2', '5–8', '50', '500'], correct: [1], explanation: 'Small rounds of 5–8 participants find most major issues; test again after fixing.', topic: 'Usability testing', difficulty: 'medium' as const, tags: ['usability'] },
]

export const REVIEW_TEXT = [
  'Clear explanations and the exercises actually build on each other. I finished feeling confident rather than just entertained.',
  'The pacing in the middle sections was just right. I would have liked one more worked example at the end.',
  'Practical and well organised. The resources are worth downloading and keeping.',
  'Good course overall. A couple of the videos ran long, but the written lessons are excellent.',
  'Exactly the level I needed — not too basic, and the instructor explains the why, not just the how.',
  'I liked that the quizzes explain the answers. Made the retakes useful instead of frustrating.',
  'Solid introduction. Some sections assume more background than the prerequisites suggest.',
  'The project at the end tied everything together. Recommended for anyone starting out.',
  'Well structured and easy to fit around work. The weekly goal tracker helped me keep going.',
  'Helpful, but I wish there were more practice problems in the second half.',
]
