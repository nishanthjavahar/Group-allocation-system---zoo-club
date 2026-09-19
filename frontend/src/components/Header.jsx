export default function Header() {
  return (
    <header className="relative z-50 min-h-[135px] overflow-hidden rounded-b-[90px] bg-gradient-to-r from-[#17652f] via-[#21753a] to-[#17652f] text-white shadow-[0_10px_30px_rgba(24,85,42,0.20)] sm:min-h-[150px] sm:rounded-b-[110px]">
      {" "}
      {/* =====================================================
          DECORATIVE BACKGROUND CURVES
      ===================================================== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Left curved layer */}
        <div className="absolute -left-20 bottom-[-65px] h-32 w-[48%] rounded-[50%] bg-[#2d8142]/60" />

        {/* Right curved layer */}
        <div className="absolute -right-20 bottom-[-65px] h-32 w-[48%] rounded-[50%] bg-[#2d8142]/60" />

        {/* Subtle center glow */}
        <div className="absolute left-1/2 top-[-100px] h-48 w-[420px] -translate-x-1/2 rounded-full bg-white/[0.035]" />
      </div>
      {/* =====================================================
          DECORATIVE PEACOCK FEATHERS
      ===================================================== */}
      {/* Left feather */}
      <div className="pointer-events-none absolute -left-2 bottom-1 hidden opacity-25 sm:block">
        <svg
          width="115"
          height="135"
          viewBox="0 0 115 135"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="-rotate-[18deg]"
        >
          {/* Feather stem */}
          <path
            d="M26 130 C35 95 53 55 82 10"
            stroke="#d9f3df"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Outer feather */}
          <ellipse
            cx="72"
            cy="38"
            rx="25"
            ry="42"
            transform="rotate(32 72 38)"
            fill="#2f8c4b"
          />

          {/* Blue section */}
          <ellipse
            cx="72"
            cy="38"
            rx="17"
            ry="29"
            transform="rotate(32 72 38)"
            fill="#1f6f9a"
          />

          {/* Gold section */}
          <ellipse
            cx="72"
            cy="38"
            rx="11"
            ry="19"
            transform="rotate(32 72 38)"
            fill="#d5b65a"
          />

          {/* Peacock eye */}
          <ellipse
            cx="72"
            cy="38"
            rx="6"
            ry="11"
            transform="rotate(32 72 38)"
            fill="#124d6a"
          />

          <ellipse
            cx="72"
            cy="38"
            rx="2.5"
            ry="5"
            transform="rotate(32 72 38)"
            fill="#f1ead2"
          />
        </svg>
      </div>
      {/* Right feather */}
      <div className="pointer-events-none absolute -right-2 bottom-1 hidden opacity-40 sm:block">
        <svg
          width="115"
          height="135"
          viewBox="0 0 115 135"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="rotate-[18deg]"
        >
          {/* Feather stem */}
          <path
            d="M89 130 C80 95 62 55 33 10"
            stroke="#d9f3df"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Outer feather */}
          <ellipse
            cx="43"
            cy="38"
            rx="25"
            ry="42"
            transform="rotate(-32 43 38)"
            fill="#2f8c4b"
          />

          {/* Blue section */}
          <ellipse
            cx="43"
            cy="38"
            rx="17"
            ry="29"
            transform="rotate(-32 43 38)"
            fill="#1f6f9a"
          />

          {/* Gold section */}
          <ellipse
            cx="43"
            cy="38"
            rx="11"
            ry="19"
            transform="rotate(-32 43 38)"
            fill="#d5b65a"
          />

          {/* Peacock eye */}
          <ellipse
            cx="43"
            cy="38"
            rx="6"
            ry="11"
            transform="rotate(-32 43 38)"
            fill="#124d6a"
          />

          <ellipse
            cx="43"
            cy="38"
            rx="2.5"
            ry="5"
            transform="rotate(-32 43 38)"
            fill="#f1ead2"
          />
        </svg>
      </div>
      {/* =====================================================
          MAIN HEADER CONTENT
      ===================================================== */}
      <div className="relative mx-auto flex min-h-[92px] w-full max-w-[1500px] items-center px-5 py-4 sm:min-h-[108px] sm:px-10 lg:px-16">
        {/* =================================================
            BBP LOGO
        ================================================= */}

        <div className="flex shrink-0 items-center">
          <img
            src="/assets/bbp-logo.png"
            alt="Bannerghatta Biological Park"
            className="
              h-[95px]
              w-auto
              object-contain
              sm:h-[82px]
              lg:h-[88px]
            "
          />
        </div>

        {/* =================================================
            DIVIDER
        ================================================= */}

        <div className="mx-4 hidden h-[52px] w-px bg-white/40 sm:mx-6 sm:block lg:mx-8" />

        {/* =================================================
            DEPARTMENT / SYSTEM NAME
        ================================================= */}

        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-wide sm:text-2xl lg:text-[28px]">
            EDUCATION DEPARTMENT
          </h1>

          <p className="mt-1 text-xs font-medium text-white/75 sm:text-sm lg:text-[15px]">
            Student Group Allocation System
          </p>
        </div>
      </div>
      {/* =====================================================
          BOTTOM CURVE HIGHLIGHT
      ===================================================== */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-full bg-white/15" />
    </header>
  );
}
