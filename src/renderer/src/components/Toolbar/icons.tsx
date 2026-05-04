import { SVGProps } from 'react'

const Icon = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    width="18" height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  />
)

export const IconBold = (): JSX.Element => (
  <Icon><path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7zM7 12h7.5a3.5 3.5 0 0 1 0 7H7z" /></Icon>
)
export const IconItalic = (): JSX.Element => (
  <Icon><path d="M14 5h-4M14 19h-4M15 5l-6 14" /></Icon>
)
export const IconStrike = (): JSX.Element => (
  <Icon>
    <path d="M16 6a4 4 0 0 0-4-2c-3 0-4 1.5-4 3 0 4.5 9 2.5 9 7 0 1.8-1.5 4-5 4a5 5 0 0 1-5-3" />
    <path d="M3 12h18" />
  </Icon>
)
export const IconH1 = (): JSX.Element => (
  <Icon><path d="M4 5v14M12 5v14M4 12h8" /><path d="M16 8l2-1.5V19" /></Icon>
)
export const IconH2 = (): JSX.Element => (
  <Icon><path d="M4 5v14M11 5v14M4 12h7" /><path d="M15 8a2 2 0 0 1 4 0c0 2-4 3-4 6v1h4" /></Icon>
)
export const IconH3 = (): JSX.Element => (
  <Icon><path d="M4 5v14M11 5v14M4 12h7" /><path d="M15 7a2 2 0 0 1 4 0c0 1.2-.8 2-2 2 1.2 0 2 .8 2 2a2 2 0 0 1-4 0" /></Icon>
)
export const IconBullet = (): JSX.Element => (
  <Icon>
    <circle cx="5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    <path d="M10 6h11M10 12h11M10 18h11" />
  </Icon>
)
export const IconOrdered = (): JSX.Element => (
  <Icon>
    <path d="M10 6h11M10 12h11M10 18h11" />
    <path d="M3 5l1.5-.5V9M3 9h3" />
    <path d="M3 12.5a1.5 1.5 0 0 1 3 0c0 1.5-3 1.5-3 3h3" />
    <path d="M3 17h2.5a1 1 0 0 1 0 2H4a1 1 0 0 1 0 2H6" />
  </Icon>
)
export const IconQuote = (): JSX.Element => (
  <Icon><path d="M5 8c0-1.5 1-3 3-3M5 8v6h4V8zM13 8c0-1.5 1-3 3-3M13 8v6h4V8z" /></Icon>
)
export const IconIndent = (): JSX.Element => (
  <Icon><path d="M3 6h18M11 12h10M11 18h10" /><path d="M3 9l3 3-3 3" /></Icon>
)
export const IconOutdent = (): JSX.Element => (
  <Icon><path d="M3 6h18M11 12h10M11 18h10" /><path d="M7 9l-3 3 3 3" /></Icon>
)
export const IconCodeBlock = (): JSX.Element => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 10l-2 2 2 2M15 10l2 2-2 2M13 9l-2 6" />
  </Icon>
)
export const IconRule = (): JSX.Element => (
  <Icon>
    <path d="M3 12h18" />
    <path d="M7 6h2M15 6h2M7 18h2M15 18h2" />
  </Icon>
)
export const IconLink = (): JSX.Element => (
  <Icon>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Icon>
)
export const IconSystem = (): JSX.Element => (
  <Icon>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4v16" />
    <path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none" />
  </Icon>
)
export const IconMoon = (): JSX.Element => (
  <Icon><path d="M20 14a8 8 0 1 1-9.5-9.5A6 6 0 0 0 20 14z" /></Icon>
)
export const IconSun = (): JSX.Element => (
  <Icon>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Icon>
)
export const IconSource = (): JSX.Element => (
  <Icon>
    <path d="M9 7l-5 5 5 5" />
    <path d="M15 7l5 5-5 5" />
  </Icon>
)
export const IconWysiwyg = (): JSX.Element => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 9h10M7 13h7M7 17h9" />
  </Icon>
)
