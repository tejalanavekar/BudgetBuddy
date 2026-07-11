// Shared outline-only icon set for the whole app — replaces colored emoji everywhere.
// Every icon is a simple stroke-only SVG (no fill, no colored badge behind it), 24x24 viewBox,
// stroke="currentColor" so it automatically picks up whatever text color already applies in
// context — white on the app's dark containers (--text-on-container), dark navy on the light
// page background (--text-on-page) — no separate color rule needed anywhere.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

const Svg = ({ size = 20, className = '', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={{ flexShrink: 0 }} {...base}>
    {children}
  </svg>
);

export const ReceiptIcon = (p) => (
  <Svg {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /></Svg>
);

export const ChartIcon = (p) => (
  <Svg {...p}><path d="M4 20V10M12 20V4M20 20v-7" /></Svg>
);

export const WalletIcon = (p) => (
  <Svg {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16" cy="14.5" r="1.2" /></Svg>
);

export const WarningIcon = (p) => (
  <Svg {...p}><path d="M12 3l10 18H2L12 3z" /><line x1="12" y1="10" x2="12" y2="14" /><circle cx="12" cy="17" r="0.5" fill="currentColor" /></Svg>
);

export const CheckIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></Svg>
);

export const SearchIcon = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
);

export const BotIcon = (p) => (
  <Svg {...p}><rect x="4" y="8" width="16" height="12" rx="2" /><circle cx="9" cy="14" r="1" fill="currentColor" /><circle cx="15" cy="14" r="1" fill="currentColor" /><path d="M12 8V4M9 4h6" /></Svg>
);

export const UploadIcon = (p) => (
  <Svg {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" /></Svg>
);

export const WaveIcon = (p) => (
  <Svg {...p}>
    <path d="M8 13V7a1.5 1.5 0 0 1 3 0v5" />
    <path d="M11 12V5a1.5 1.5 0 0 1 3 0v7" />
    <path d="M14 12V7a1.5 1.5 0 0 1 3 0v5" />
    <path d="M17 13v-2a1.5 1.5 0 0 1 3 0v4c0 3-2 6-5.5 6-3 0-4.3-1.2-5.7-3.5L7 15c-.6-1 .2-2 1.2-2 .6 0 1.1.3 1.5 1l1 1.5" />
  </Svg>
);

export const UserIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" /></Svg>
);

export const TrendingUpIcon = (p) => (
  <Svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></Svg>
);

export const ShoppingBagIcon = (p) => (
  <Svg {...p}><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></Svg>
);

export const LightbulbIcon = (p) => (
  <Svg {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.5.4.8 1 .8 1.6v.5h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0012 3z" /></Svg>
);

export const FilmIcon = (p) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 15h18M8 4v5M8 15v5M16 4v5M16 15v5" /></Svg>
);

export const CalendarIcon = (p) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Svg>
);

export const EditIcon = (p) => (
  <Svg {...p}><path d="M4 20h4l11-11a2.1 2.1 0 00-3-3L5 17v3z" /><path d="M13.5 6.5l3 3" /></Svg>
);

export const TrashIcon = (p) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" /><path d="M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></Svg>
);

export const ArchiveIcon = (p) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v9a2 2 0 002 2h10a2 2 0 002-2V9" /><line x1="10" y1="13" x2="14" y2="13" /></Svg>
);

export const LogoutIcon = (p) => (
  <Svg {...p}><path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3" /><path d="M15 16l4-4-4-4" /><line x1="19" y1="12" x2="9" y2="12" /></Svg>
);

export const InboxEmptyIcon = (p) => (
  <Svg {...p}><path d="M3 12l2-7h14l2 7" /><path d="M3 12v6a2 2 0 002 2h14a2 2 0 002-2v-6" /><path d="M3 12h5l1.5 2h5L16 12h5" /></Svg>
);

export const KeyIcon = (p) => (
  <Svg {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M14 9l2 2" /></Svg>
);

export const PaperclipIcon = (p) => (
  <Svg {...p}><path d="M21 12.5L12.5 21a4.5 4.5 0 01-6.4-6.4L14.8 6a3 3 0 014.2 4.2L10.6 18.6a1.5 1.5 0 01-2.1-2.1L16 8" /></Svg>
);

export const ClipboardIcon = (p) => (
  <Svg {...p}><rect x="5" y="5" width="14" height="16" rx="2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="16" y2="15" /></Svg>
);

export const RefreshIcon = (p) => (
  <Svg {...p}><path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3" /><path d="M18 3v4h-4M6 21v-4h4" /></Svg>
);

export const CloseIcon = (p) => (
  <Svg {...p}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></Svg>
);

export const ChatIcon = (p) => (
  <Svg {...p}><path d="M4 5h16v11H8l-4 4V5z" /></Svg>
);

export const BurgerIcon = (p) => (
  <Svg {...p}><path d="M4 10h16M3 14h18M5 18h14" /><path d="M4 10a8 4 0 0116 0" /></Svg>
);

export const CarIcon = (p) => (
  <Svg {...p}><path d="M3 16V12l2-5h14l2 5v4" /><path d="M3 16h18v3H3z" /><circle cx="7" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></Svg>
);

export const PillIcon = (p) => (
  <Svg {...p}><rect x="4" y="9" width="16" height="7" rx="3.5" transform="rotate(-45 12 12)" /><line x1="9.5" y1="14.5" x2="14.5" y2="9.5" /></Svg>
);

export const BookIcon = (p) => (
  <Svg {...p}><path d="M4 5c2-1 5-1 8 0v14c-3-1-6-1-8 0V5z" /><path d="M20 5c-2-1-5-1-8 0v14c3-1 6-1 8 0V5z" /></Svg>
);

export const PlaneIcon = (p) => (
  <Svg {...p}><path d="M10.5 19l1.5-5 7-2.5c1-.4 1-1.6 0-2L12 7l-1.5-5-1.5 1 .5 5-4 1-2-2-1.5.5 1.5 3.5-1.5 1 .5 1.5 3.5-.5 1 3.5-1.5 1 1.5.5z" /></Svg>
);

export const DocumentIcon = (p) => (
  <Svg {...p}><path d="M7 3h7l4 4v14H7V3z" /><path d="M14 3v4h4" /></Svg>
);

export const FireIcon = (p) => (
  <Svg {...p}><path d="M12 3c1 3-3 4-3 7a3 3 0 006 0c0-1-.5-2-1-2.5.8 2 .5 4-2 5.5a4 4 0 01-4-6C8.5 5 10 3.5 12 3z" /></Svg>
);

export const HourglassIcon = (p) => (
  <Svg {...p}><path d="M6 3h12M6 21h12" /><path d="M7 3c0 5 4 6 5 9 1-3 5-4 5-9" /><path d="M7 21c0-5 4-6 5-9 1 3 5 4 5 9" /></Svg>
);

export const TrophyIcon = (p) => (
  <Svg {...p}><path d="M8 4h8v5a4 4 0 01-8 0V4z" /><path d="M8 5H4v2a4 4 0 004 4M16 5h4v2a4 4 0 01-4 4" /><path d="M12 13v4M9 21h6M10 17h4v4h-4v-4z" /></Svg>
);

export const LaptopIcon = (p) => (
  <Svg {...p}><rect x="4" y="4" width="16" height="10" rx="1" /><path d="M2 18h20l-2-3H4l-2 3z" /></Svg>
);

export const MusicIcon = (p) => (
  <Svg {...p}><path d="M9 18V5l10-2v13" /><circle cx="7" cy="18" r="2.5" /><circle cx="17" cy="16" r="2.5" /></Svg>
);

export const MuscleIcon = (p) => (
  <Svg {...p}><path d="M5 13c0-2 1-3 3-3s2 1 3 1 1-2 3-2 4 1 4 4c0 3-2 6-6 6h-2c-3 0-5-2-5-4v-2z" /></Svg>
);

export const CloudIcon = (p) => (
  <Svg {...p}><path d="M7 18a4 4 0 01-1-7.9A5 5 0 0116 8a4.5 4.5 0 01-1 10H7z" /></Svg>
);

export const NewspaperIcon = (p) => (
  <Svg {...p}><path d="M4 5h13a3 3 0 013 3v11H7a3 3 0 01-3-3V5z" /><path d="M4 5v11a3 3 0 003 3" /><line x1="8" y1="9" x2="14" y2="9" /><line x1="8" y1="12" x2="14" y2="12" /><line x1="8" y1="15" x2="12" y2="15" /></Svg>
);

export const FolderIcon = (p) => (
  <Svg {...p}><path d="M3 7a1 1 0 011-1h5l2 2h9a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" /></Svg>
);

export const BoxIcon = (p) => (
  <Svg {...p}><path d="M3 8l9-5 9 5-9 5-9-5z" /><path d="M3 8v9l9 5 9-5V8" /><line x1="12" y1="13" x2="12" y2="22" /></Svg>
);

// Expense category -> icon, so call sites can do <CategoryIcon category={cat} /> instead of
// looking up an emoji string themselves.
const EXPENSE_CATEGORY_ICON = {
  Food: BurgerIcon, Transport: CarIcon, Utilities: LightbulbIcon, Entertainment: FilmIcon,
  Health: PillIcon, Education: BookIcon, Shopping: ShoppingBagIcon, Travel: PlaneIcon,
  Savings: WalletIcon, Other: BoxIcon
};

export const CategoryIcon = ({ category, size, className }) => {
  const IconComponent = EXPENSE_CATEGORY_ICON[category] || BoxIcon;
  return <IconComponent size={size} className={className} />;
};

// Subscription category -> icon (a different domain than expense categories — see categoryMeta.js)
const SUBSCRIPTION_CATEGORY_ICON = {
  Software: LaptopIcon, Streaming: FilmIcon, Music: MusicIcon, Health: MuscleIcon,
  Storage: CloudIcon, News: NewspaperIcon, Other: BoxIcon
};

export const SubscriptionCategoryIcon = ({ category, size, className }) => {
  const IconComponent = SUBSCRIPTION_CATEGORY_ICON[category] || BoxIcon;
  return <IconComponent size={size} className={className} />;
};
