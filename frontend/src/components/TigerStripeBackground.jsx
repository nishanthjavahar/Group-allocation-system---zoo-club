export default function TigerStripeBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="none"
      >
        <g
          fill="none"
          stroke="#53634f"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.015"
        >
          <path d="M-100 170 C180 30, 280 300, 520 130 S850 20, 1080 180 S1400 300, 1700 120" />
          <path d="M-150 300 C100 170, 300 430, 550 270 S850 150, 1100 310 S1400 420, 1750 230" />
          <path d="M-100 450 C150 320, 300 570, 570 410 S850 300, 1120 470 S1400 550, 1750 380" />
          <path d="M-150 610 C120 470, 330 750, 580 580 S900 450, 1150 630 S1450 720, 1750 540" />
          <path d="M-100 780 C150 630, 330 900, 600 750 S900 620, 1160 800 S1450 880, 1750 700" />
          <path d="M-120 940 C150 800, 350 1050, 620 900 S920 770, 1180 950 S1450 1020, 1750 850" />
        </g>

        <g
          fill="none"
          stroke="#87917d"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.035"
        >
          <path d="M-50 100 C180 220, 320 40, 520 220 S850 350, 1080 190 S1400 80, 1700 260" />
          <path d="M-100 520 C180 650, 300 450, 540 620 S850 750, 1100 580 S1400 480, 1700 650" />
        </g>
      </svg>
    </div>
  );
}
