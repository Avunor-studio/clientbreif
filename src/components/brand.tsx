export function BrandMark({ size = 29 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="7" fill="#181817" />
      <path
        d="M20 14h17v9a5 5 0 0 0 5 5h7v12a5 5 0 0 1-5 5H30l-6 6a1 1 0 0 1-2-1v-5h-2a5 5 0 0 1-5-5V19a5 5 0 0 1 5-5Zm21 0 8 10h-7a1 1 0 0 1-1-1v-9Z"
        fill="#fff"
      />
      <rect x="23" y="33" width="18" height="4" rx="2" fill="#181817" />
    </svg>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <BrandMark />
      <span>ClientBrief</span>
    </span>
  );
}
