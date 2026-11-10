const SIZES = {
  sm: 28,
  md: 40,
  lg: 56,
  xl: 72,
};

/**
 * Logotipo de RutaIA: la "R" trazada en SVG sobre una placa con degradado
 * de atardecer (ámbar → coral → violeta). Sin dependencia de fuentes.
 */
export default function BrandMark({ size = 'md', className = '', label = 'RutaIA' }) {
  const px = SIZES[size] ?? SIZES.md;

  return (
    <svg
      className={`brand-logo brand-logo-${size} ${className}`.trim()}
      width={px}
      height={px}
      viewBox="0 0 64 64"
      role="img"
      aria-label={label}
      focusable="false"
    >
      <defs>
        <linearGradient id="rutaia-sunset" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd08a" />
          <stop offset="34%" stopColor="#ff9a6b" />
          <stop offset="68%" stopColor="#e85d75" />
          <stop offset="100%" stopColor="#6b3fa0" />
        </linearGradient>
        <linearGradient id="rutaia-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <path
          id="rutaia-r"
          d="M22 48V17h11.4c6.6 0 10.9 3.7 10.9 9.4 0 4.5-2.5 7.6-6.9 8.8L45 48h-7.4l-6.9-11.6h-2.4V48H22Zm6.3-17.3h4.5c3 0 4.8-1.5 4.8-4.1s-1.8-4-4.8-4h-4.5v8.1Z"
        />
      </defs>

      <rect x="0" y="0" width="64" height="64" rx="18" fill="url(#rutaia-sunset)" />
      <rect x="0" y="0" width="64" height="64" rx="18" fill="url(#rutaia-sheen)" />
      <clipPath id="rutaia-plate">
        <rect x="0" y="0" width="64" height="64" rx="18" />
      </clipPath>

      <g clipPath="url(#rutaia-plate)">
        {/* Sol sobre el horizonte */}
        <circle cx="43" cy="27" r="11" fill="#fff4da" opacity="0.34" />
        <circle cx="43" cy="27" r="5.5" fill="#fff8e8" opacity="0.72" />

        {/* Cordillera del altiplano */}
        <path
          d="M-2 50c6-5.6 11.4-7.6 16.6-6.2 5.2 1.4 7.6 4.6 12.4 4.6 5.4 0 9-3.4 14.6-3.4 7 0 12.6 2.8 24.4 9.6V66H-2Z"
          fill="#331a4f"
          opacity="0.38"
        />
        <path
          d="M-2 56c8-4.2 15-5.4 22-3 6.4 2.2 10.6 3 16.6 1.4 5.6-1.5 9-3.4 15.4-2.4 5.8.9 10 3.4 14 7V66H-2Z"
          fill="#241038"
          opacity="0.5"
        />
      </g>

      <use href="#rutaia-r" fill="#fffaf2" />
      <use
        href="#rutaia-r"
        fill="none"
        stroke="#2c1440"
        strokeWidth="0.8"
        opacity="0.22"
      />
    </svg>
  );
}
