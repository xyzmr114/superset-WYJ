// Flat inline illustrations for the landing page: the plane, the jumper (freefall and
// canopy poses in one drawing) and the landed figure. No image files.

const INK = '#232424';
const ACCENT = 'var(--jump-accent)';
const CANOPY = 'var(--jump-canopy)';
const CANOPY_LIGHT = 'var(--jump-canopy-light)';
const BODY = '#faf5ee';
const WING = '#d9d1c8';

/** Small plane flying right, door open on its side. */
export function Plane({className}: {className?: string}) {
  return (
    <svg className={className} viewBox="0 0 360 150" aria-hidden="true">
      {/* Contrail */}
      <path d="M0 74 C40 70 70 78 104 72" fill="none" stroke={INK} strokeOpacity=".18" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" />
      {/* Far wing */}
      <path d="M176 66 L214 22 L236 22 L222 66Z" fill={WING} />
      {/* Tail */}
      <path d="M112 70 L96 30 L118 30 L146 66Z" fill={ACCENT} />
      <path d="M104 74 L82 66 L88 80Z" fill={WING} />
      {/* Fuselage */}
      <path d="M104 64 C130 56 250 54 300 60 C330 64 346 72 346 80 C346 88 330 94 300 96 C240 100 140 98 112 90 C100 86 98 70 104 64Z" fill={BODY} stroke={INK} strokeWidth="2.5" />
      {/* Cockpit and windows */}
      <path d="M300 64 C318 66 332 72 336 78 L304 78Z" fill="#8cb8d1" />
      <g fill="#8cb8d1">
        <rect x="160" y="70" width="12" height="9" rx="3" />
        <rect x="184" y="70" width="12" height="9" rx="3" />
        <rect x="256" y="70" width="12" height="9" rx="3" />
      </g>
      {/* Open door */}
      <rect x="212" y="66" width="28" height="26" rx="3" fill={INK} />
      {/* Stripe */}
      <path d="M118 84 C170 88 250 88 330 84" fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" />
      {/* Near wing */}
      <path d="M196 86 L236 136 L262 136 L240 86Z" fill="#efe7dd" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* Propeller */}
      <ellipse cx="348" cy="80" rx="3" ry="18" fill={INK} opacity=".55" />
    </svg>
  );
}

/**
 * The jumper. `--open` (0..1) on an ancestor blends the star-shaped freefall pose into
 * the hanging pose and unfurls the canopy; `--fold` (0..1) collapses it on landing.
 */
export function Jumper({className}: {className?: string}) {
  return (
    <svg className={className} viewBox="0 0 120 170" aria-hidden="true">
      <g className="jump-canopy">
        <path d="M8 62 C10 22 38 4 60 4 C82 4 110 22 112 62 C98 56 86 56 76 62 C68 56 52 56 44 62 C34 56 22 56 8 62Z" fill={CANOPY} />
        <path d="M44 62 C46 30 52 12 60 4 C68 12 74 30 76 62 C68 56 52 56 44 62Z" fill={CANOPY_LIGHT} />
        <path d="M10 62 L54 116 M44 62 L57 114 M76 62 L63 114 M110 62 L66 116" stroke={INK} strokeWidth="1.2" strokeOpacity=".7" />
      </g>
      <g className="jump-hang" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 124 L60 148 M60 128 L52 114 M60 128 L68 114 M60 148 L54 166 M60 148 L66 166" />
      </g>
      <g className="jump-star" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 124 L60 146 M60 130 L42 118 M60 130 L78 118 M60 146 L46 162 M60 146 L74 162" />
      </g>
      <circle cx="60" cy="116" r="7.5" fill={INK} />
      <rect x="55" y="124" width="10" height="6" rx="2" fill={ACCENT} />
    </svg>
  );
}

/** Standing figure with the canopy folded on the grass beside them (the page draws the ground). */
export function Landed({className}: {className?: string}) {
  return (
    <svg className={className} viewBox="0 0 180 120" aria-hidden="true">
      <path d="M70 108 C78 84 104 74 136 80 C158 84 172 96 176 108Z" fill={CANOPY} />
      <path d="M96 108 C102 92 116 84 132 84 C122 92 116 100 114 108Z" fill={CANOPY_LIGHT} />
      <path d="M58 70 C80 74 100 86 112 104" fill="none" stroke={INK} strokeWidth="1.2" strokeOpacity=".6" />
      <g fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M44 64 L44 88 M44 70 L30 56 M44 70 L58 78 M44 88 L36 108 M44 88 L52 108" />
      </g>
      <circle cx="44" cy="56" r="7.5" fill={INK} />
      <rect x="39" y="64" width="10" height="6" rx="2" fill={ACCENT} />
    </svg>
  );
}
