export function Brand() {
  return (
    <span className="brand">
      <svg
        className="brand-mark"
        width="27"
        height="32"
        viewBox="0 0 27 32"
        fill="none"
        aria-hidden="true"
      >
        <path d="M3 1.5h14l7 7v22H3z" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M17 1.5v8h7M8 15h11M8 20h11M8 25h7"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
      <span>
        ClientBrief<span className="brand-period">.</span>
      </span>
    </span>
  );
}
