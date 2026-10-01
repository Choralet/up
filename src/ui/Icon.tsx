import type { ReactElement } from 'react'

/** Line icons on a 24 grid, drawn with currentColor. `solid` parts are filled. Never emoji. */
const PATHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path d="M9.5 5.5l6.5 6.5-6.5 6.5" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" />
    </>
  ),
  star: <path className="solid" d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.9l-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  dots: <path d="M6 12h.01M12 12h.01M18 12h.01" />,
  flame: <path className="solid" d="M12 2.5c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" />,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  push: <path d="M5 16l7-7 7 7" />,
  pull: <path d="M5 8l7 7 7-7" />,
  legs: <path d="M9 3v7l4 4v7M15 21v-5" />,
  core: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle className="solid" cx="12" cy="12" r="2.5" />
    </>
  ),
} satisfies Record<string, ReactElement>

export type IconName = keyof typeof PATHS
export const ICON_NAMES = Object.keys(PATHS) as IconName[]

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className ? `icon ${className}` : 'icon'} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}
