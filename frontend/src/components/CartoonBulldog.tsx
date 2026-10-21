/**
 * Full-body cartoon bulldog in a Yale sweater. It waves, blinks, and wags.
 * Used big in the home page hero and (with a costume hat) in the welcome pop-up.
 */
export type BulldogHat = 'witch' | 'santa' | 'grad' | 'party'

export default function CartoonBulldog({
  hat,
  className = '',
  title = 'Cartoon bulldog in a Yale sweater, waving',
}: {
  hat?: BulldogHat
  className?: string
  title?: string
}) {
  return (
    <svg className={`cartoon-bulldog ${className}`} viewBox="0 0 400 420" role="img" aria-label={title}>
      <title>{title}</title>
      {/* ground shadow */}
      <ellipse cx="200" cy="398" rx="130" ry="14" fill="rgba(0,0,0,0.18)" />

      <g className="cb-body">
        {/* back legs */}
        <ellipse cx="112" cy="362" rx="44" ry="30" fill="#e7cfb0" />
        <ellipse cx="288" cy="362" rx="44" ry="30" fill="#e7cfb0" />

        {/* sweater body */}
        <path d="M118 228 Q120 196 160 188 L240 188 Q280 196 282 228 L296 350 Q298 384 260 386 L140 386 Q102 384 104 350 Z" fill="#00356b" />
        {/* sweater ribbing */}
        <path d="M108 362 L292 362" stroke="#0a4a8f" strokeWidth="10" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <line key={i} x1={118 + i * 15} y1="357" x2={118 + i * 15} y2="367" stroke="#00254a" strokeWidth="2" />
        ))}
        {/* collar */}
        <path d="M150 192 Q200 222 250 192" stroke="#ffffff" strokeWidth="12" fill="none" strokeLinecap="round" />
        {/* big Y */}
        <path d="M172 250 L200 288 L228 250 M200 288 L200 328" stroke="#ffffff" strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* left arm (resting) */}
        <path d="M128 230 Q104 290 138 338" stroke="#00356b" strokeWidth="38" fill="none" strokeLinecap="round" />
        {/* front paws */}
        <g>
          <ellipse cx="160" cy="378" rx="34" ry="20" fill="#f3e2cc" />
          <path d="M150 368 L150 386 M162 366 L162 388 M174 368 L174 386" stroke="#c9a883" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="240" cy="378" rx="34" ry="20" fill="#f3e2cc" />
          <path d="M228 368 L228 386 M240 366 L240 388 M252 368 L252 386" stroke="#c9a883" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* right arm, waving */}
        <g className="cb-wave">
          <path d="M270 222 Q318 198 330 140" stroke="#00356b" strokeWidth="38" fill="none" strokeLinecap="round" />
          <circle cx="332" cy="122" r="27" fill="#f3e2cc" />
          <path d="M318 106 Q322 98 330 100 M334 98 Q340 92 346 98 M346 108 Q354 106 356 114" stroke="#c9a883" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        {/* head */}
        <g className="cb-head">
          {/* ears */}
          <path d="M92 92 Q70 50 118 54 Q126 80 112 104 Z" fill="#a9784f" />
          <path d="M308 92 Q330 50 282 54 Q274 80 288 104 Z" fill="#a9784f" />
          {/* face */}
          <path d="M84 132 Q84 58 200 54 Q316 58 316 132 Q324 196 268 214 Q200 236 132 214 Q76 196 84 132 Z" fill="#ecd3b2" />
          {/* forehead wrinkles */}
          <path d="M168 84 Q200 72 232 84" stroke="#c9a883" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M176 100 Q200 92 224 100" stroke="#c9a883" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* eye patch */}
          <ellipse cx="146" cy="126" rx="34" ry="30" fill="#a9784f" />
          {/* eyes */}
          <g className="cb-eyes">
            <ellipse cx="148" cy="128" rx="17" ry="19" fill="#1d1d1d" />
            <ellipse cx="252" cy="128" rx="17" ry="19" fill="#1d1d1d" />
            <circle cx="154" cy="120" r="6" fill="#fff" />
            <circle cx="258" cy="120" r="6" fill="#fff" />
            <circle cx="143" cy="136" r="2.5" fill="#fff" />
            <circle cx="247" cy="136" r="2.5" fill="#fff" />
          </g>
          {/* blush */}
          <ellipse cx="112" cy="172" rx="16" ry="9" fill="#f4a5a0" opacity="0.6" />
          <ellipse cx="288" cy="172" rx="16" ry="9" fill="#f4a5a0" opacity="0.6" />
          {/* muzzle */}
          <ellipse cx="172" cy="178" rx="46" ry="34" fill="#fffaf3" />
          <ellipse cx="228" cy="178" rx="46" ry="34" fill="#fffaf3" />
          {/* nose */}
          <ellipse cx="200" cy="152" rx="27" ry="17" fill="#1d1d1d" />
          <ellipse cx="192" cy="147" rx="8" ry="4" fill="#555" />
          <path d="M200 168 L200 182" stroke="#1d1d1d" strokeWidth="4" />
          {/* mouth: underbite with teeth and tongue */}
          <path d="M152 186 Q176 214 200 192 Q224 214 248 186" stroke="#1d1d1d" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M184 202 Q200 236 216 202 Z" fill="#e2645a" stroke="#1d1d1d" strokeWidth="3" />
          <path d="M200 206 L200 222" stroke="#c4473f" strokeWidth="2" />
          <path d="M164 196 L169 182 L174 196 Z" fill="#fff" stroke="#1d1d1d" strokeWidth="2" />
          <path d="M226 196 L231 182 L236 196 Z" fill="#fff" stroke="#1d1d1d" strokeWidth="2" />

          {hat === 'witch' && (
            <g className="cb-hat">
              <ellipse cx="200" cy="66" rx="120" ry="18" fill="#2a1240" />
              <path d="M136 64 L214 -40 Q226 -44 230 -30 L262 64 Z" fill="#3b1a5c" />
              <path d="M146 54 L254 54 L258 66 L142 66 Z" fill="#ff8a1f" />
              <path d="M230 -30 Q258 -30 270 -6" stroke="#3b1a5c" strokeWidth="14" fill="none" strokeLinecap="round" />
            </g>
          )}
          {hat === 'santa' && (
            <g className="cb-hat">
              <path d="M120 70 Q200 -10 284 70 Z" fill="#d62828" />
              <path d="M270 40 Q320 30 330 80" stroke="#d62828" strokeWidth="26" fill="none" strokeLinecap="round" />
              <circle cx="332" cy="90" r="18" fill="#fff" />
              <rect x="108" y="58" width="188" height="24" rx="12" fill="#fff" />
            </g>
          )}
          {hat === 'grad' && (
            <g className="cb-hat">
              <path d="M120 40 L200 10 L280 40 L200 70 Z" fill="#1d1d1d" />
              <rect x="160" y="44" width="80" height="26" fill="#1d1d1d" />
              <path d="M280 40 L286 90" stroke="#ffd34e" strokeWidth="4" />
              <circle cx="286" cy="94" r="6" fill="#ffd34e" />
            </g>
          )}
          {hat === 'party' && (
            <g className="cb-hat">
              <path d="M170 64 L208 -20 L240 64 Z" fill="#ffd34e" />
              <path d="M180 44 L230 44 M188 24 L224 24" stroke="#00356b" strokeWidth="6" />
              <circle cx="208" cy="-22" r="10" fill="#f04f36" />
            </g>
          )}
        </g>
      </g>
    </svg>
  )
}
