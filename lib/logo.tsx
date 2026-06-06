export function BinderLogo({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="38" height="38" rx="10" fill="url(#binder-grad)" />
      <rect x="1" y="1" width="36" height="36" rx="9" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <rect x="7" y="8" width="24" height="20" rx="2" fill="rgba(255,255,255,0.9)" />
      <rect x="7" y="8" width="24" height="4" rx="1" fill="rgba(255,255,255,0.95)" />
      <circle cx="14" cy="10" r="1.5" fill="#d96a26" />
      <circle cx="19" cy="10" r="1.5" fill="#d96a26" />
      <circle cx="24" cy="10" r="1.5" fill="#d96a26" />
      <line x1="10" y1="15" x2="28" y2="15" stroke="#d96a26" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="10" y1="18" x2="24" y2="18" stroke="#d96a26" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="10" y1="21" x2="26" y2="21" stroke="#d96a26" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="10" y1="24" x2="22" y2="24" stroke="#d96a26" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
      <defs>
        <linearGradient id="binder-grad" x1="0" y1="0" x2="38" y2="38">
          <stop offset="0%" stopColor="#d96a26" />
          <stop offset="100%" stopColor="#c45a1e" />
        </linearGradient>
      </defs>
    </svg>
  );
}
