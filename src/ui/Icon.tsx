import type { ReactElement } from 'react'

/** Line icons on a 24 grid, drawn with currentColor. `solid` parts are filled. Never emoji. */
const PATHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path d="M9.5 5.5l6.5 6.5-6.5 6.5" />,
  gear: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
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
  legs: <path d="M9 3.5v6.5l-3 10M15 3.5v6.5l3 10M9 10h6" />,
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
