export function Brand() {
  return (
    <span className="brand">
      <svg
        className="brand-mark"
        width="29"
        height="29"
        viewBox="0 0 29 29"
        fill="none"
        aria-hidden="true"
      >
        <rect width="29" height="29" rx="4" fill="currentColor" />
        <path
          d="M9 6.5h7l4 4v12H9zM16 6.5v4h4M12 14h5M12 17h5M12 20h3"
          stroke="white"
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span>ClientBrief</span>
    </span>
  );
}
