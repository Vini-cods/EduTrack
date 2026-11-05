import { useEffect, useId, useState } from 'react';
import './MorganaPet.css';

export type MorganaPetState = 'idle' | 'thinking' | 'speaking' | 'error' | 'walking';

interface MorganaPetProps {
  state?: MorganaPetState;
  size?: number;
  className?: string;
}

/** Vector interpretation of the supplied Morgana reference; its parent supplies the accessible name. */
export function MorganaPet({ state = 'idle', size = 96, className = '' }: MorganaPetProps) {
  const id = `morgana-${useId().replace(/:/g, '')}`;
  const paint = (name: string) => `url(#${id}-${name})`;
  const [paused, setPaused] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const onVisibilityChange = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return (
    <span className={`morgana-pet ${className}`} data-state={state} data-paused={paused} style={{ width: size }} aria-hidden="true">
      <svg viewBox="0 0 208 264" fill="none" focusable="false" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-fur`} cx=".35" cy=".16" r=".84">
            <stop stopColor="#46505F" /><stop offset=".28" stopColor="#202735" /><stop offset=".7" stopColor="#0B1019" /><stop offset="1" stopColor="#03070D" />
          </radialGradient>
          <radialGradient id={`${id}-shine`} cx=".5" cy=".5" r=".5">
            <stop stopColor="#D0D9E6" stopOpacity=".65" /><stop offset="1" stopColor="#8595AE" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-white`} x1=".2" y1="0" x2=".7" y2="1">
            <stop stopColor="#FFFFF7" /><stop offset=".6" stopColor="#F2F1E4" /><stop offset="1" stopColor="#BFC5BE" />
          </linearGradient>
          <linearGradient id={`${id}-body`} x1="0" y1=".2" x2="1" y2=".8">
            <stop stopColor="#060B13" /><stop offset=".65" stopColor="#19212C" /><stop offset="1" stopColor="#314C6C" />
          </linearGradient>
          <radialGradient id={`${id}-eye`} cx=".25" cy=".16" r=".9">
            <stop stopColor="#69DAFF" /><stop offset=".55" stopColor="#1B9DE2" /><stop offset="1" stopColor="#0870AA" />
          </radialGradient>
          <linearGradient id={`${id}-gold`} x1=".2" y1="0" x2=".85" y2="1">
            <stop stopColor="#FFEA73" /><stop offset=".5" stopColor="#EFC72F" /><stop offset="1" stopColor="#B28912" />
          </linearGradient>
          <linearGradient id={`${id}-belt`} x1="0" y1="0" x2="1" y2=".6">
            <stop stopColor="#151B22" /><stop offset=".6" stopColor="#394550" /><stop offset="1" stopColor="#101822" />
          </linearGradient>
        </defs>

        <ellipse cx="84" cy="255" rx="47" ry="4" className="morgana-pet__shadow" />
        <g className="morgana-pet__figure" stroke="#080D15" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <g className="morgana-pet__tail">
            <path d="M108 209C136 208 162 204 161 188C160 173 144 163 148 146C151 132 165 128 178 135C182 137 185 141 187 144" stroke="#4772A0" strokeWidth="8.5" />
            <path d="M108 209C136 208 162 204 161 188C160 173 144 163 148 146C151 132 165 128 178 135C182 137 185 141 187 144" stroke="#090D14" strokeWidth="6.5" />
            <path d="M173 133C179 134 184 138 187 144" stroke="#AAB2B0" strokeWidth="9" />
            <path d="M174 133C180 135 184 138 187 144" stroke="#F4F4E9" strokeWidth="7" />
          </g>
          <g className="morgana-pet__leg morgana-pet__leg--left">
            <path d="M54 212L48 233L52 247L61 248L72 218Z" fill={paint('body')} />
            <path d="M49 234L53 247L60 247L65 236L62 232L55 235Z" fill={paint('white')} stroke="#6E787C" strokeWidth="1.1" />
            <path d="M52 247C53 252 61 253 62 248L59 244Z" fill={paint('white')} stroke="#6E787C" strokeWidth="1.1" />
          </g>
          <g className="morgana-pet__leg morgana-pet__leg--right">
            <path d="M84 215L94 237L102 250L112 249L108 231L104 213Z" fill={paint('body')} />
            <path d="M98 234L102 248L110 250L114 247L107 232L103 235Z" fill={paint('white')} stroke="#6E787C" strokeWidth="1.1" />
            <path d="M104 247L107 254L115 253L116 250L111 246Z" fill={paint('white')} stroke="#6E787C" strokeWidth="1.1" />
          </g>
          <path d="M62 141C48 149 43 172 45 194L42 216C58 232 91 234 111 218L108 192C110 170 104 151 91 143Z" fill={paint('body')} />
          <path d="M102 157C108 173 106 190 108 208" stroke="#46688D" strokeWidth="2.4" opacity=".65" />
          <g className="morgana-pet__belt">
            <path d="M43 194C61 201 91 201 109 192L112 213C91 224 59 224 40 214Z" fill={paint('belt')} />
            <path d="M47 198C65 205 90 204 106 198" stroke="#667176" strokeWidth="1.3" />
            <path d="M43 194L37 198L35 217L47 222L52 201Z" fill={paint('body')} />
            <path d="M102 193L116 193L121 215L109 222L104 214Z" fill="#182B3F" />
            <path d="M109 197L114 197L117 211L112 214Z" fill="#386184" stroke="none" />
            <path d="M47 201L54 203L53 213L46 211Z" fill={paint('gold')} stroke="#7F6514" strokeWidth="1" />
            <path d="M48 205L51 206L50 209L47 208Z" fill="#31352F" stroke="none" />
            <ellipse cx="81" cy="209" rx="7" ry="6.5" fill={paint('gold')} stroke="#7F6514" strokeWidth="1" />
            <path d="M81 205V212" stroke="#695117" strokeWidth="2" />
            <path d="M40 200L38 214M114 196L118 211" stroke="#59707E" strokeWidth="1.2" />
          </g>

          <g className="morgana-pet__head">
            <path d="M43 37L83 5L89 2L83 29L66 47Z" fill={paint('fur')} />
            <path d="M51 34L80 12L76 30L64 38Z" fill={paint('white')} stroke="#63707B" strokeWidth="1.2" />
            <path d="M142 42L198 59L165 79L143 70Z" fill="#142335" stroke="#111721" strokeWidth="2.2" />
            <path d="M154 48L188 60L164 71Z" fill={paint('white')} stroke="#6B7C88" strokeWidth="1.1" />
            <path d="M162 56L177 60L163 65" stroke="#9CA8AC" strokeWidth="1" />
            <path d="M75 23C41 25 12 47 8 77C2 110 29 132 67 139C106 147 144 132 158 108C176 79 157 45 127 31C112 24 94 21 75 23Z" fill={paint('fur')} />
            <path d="M135 37C159 50 171 75 162 98L153 117" stroke="#3185CA" strokeWidth="3.4" />
            <path d="M141 39C157 50 164 65 165 78" stroke="#73B5EC" strokeWidth="1.3" opacity=".8" />
            <path d="M14 72C26 45 47 31 72 27" stroke="#66717E" strokeWidth="1.3" opacity=".8" />
            <ellipse cx="76" cy="34" rx="23" ry="8" transform="rotate(-9 76 34)" fill={paint('shine')} stroke="none" />
            <path d="M9 88C32 81 48 84 65 83C90 81 108 90 133 94L156 103C146 126 115 140 82 139C48 138 21 124 12 105C9 99 8 94 9 88Z" fill={paint('white')} stroke="#9AA4A4" strokeWidth="1.1" />
            <path d="M135 100C141 103 145 108 145 113" stroke="#D5D8CF" strokeWidth="3" />
            <g className="morgana-pet__eyes">
              <g transform="rotate(25 35 59)">
                <ellipse cx="35" cy="59" rx="12.6" ry="23" fill={paint('white')} stroke="#93A2AA" strokeWidth="1.1" />
                <ellipse cx="37" cy="59" rx="9.8" ry="20.8" fill={paint('eye')} stroke="#147DAF" strokeWidth=".7" />
                <ellipse cx="39" cy="58" rx="2.3" ry="12" fill="#061A2B" stroke="none" />
                <path d="M30 71C33 75 37 77 41 76" stroke="#9CE8FF" strokeWidth="1.2" />
                <ellipse cx="34" cy="47" rx="2.5" ry="4.6" fill="#E0F8FF" stroke="none" opacity=".7" />
              </g>
              <g transform="rotate(24 106 58)">
                <ellipse cx="106" cy="58" rx="22" ry="27" fill={paint('white')} stroke="#A1ACAD" strokeWidth="1.2" />
                <ellipse cx="111" cy="58" rx="17.6" ry="24" fill={paint('eye')} stroke="#1375A5" strokeWidth=".8" />
                <ellipse cx="117" cy="56" rx="3.8" ry="15.5" fill="#071A28" stroke="none" />
                <path d="M99 73C104 79 112 81 118 76" stroke="#9CE8FF" strokeWidth="1.6" />
                <ellipse cx="105" cy="43" rx="4.1" ry="6.5" fill="#E0F8FF" stroke="none" opacity=".7" />
                <path d="M91 45C93 37 98 33 103 32" stroke="#FFFFF8" strokeWidth="2" />
              </g>
            </g>
            <g className="morgana-pet__mouth-open">
              <path d="M49 98C56 106 64 108 71 107C81 108 90 105 98 99C93 116 83 132 73 130C62 127 54 112 49 98Z" fill="#35272E" stroke="#3E3D39" strokeWidth="1.2" />
              <path d="M65 119C72 111 81 112 87 116C82 125 77 129 73 128Z" fill="#CA8191" stroke="none" />
              <path d="M51 100L59 104L58 111Z" fill="#FFFFF9" stroke="none" />
            </g>
            <path d="M33 90C41 98 53 98 62 91C70 98 85 98 93 91" stroke="#B0B3A8" strokeWidth="1.4" />
            <path className="morgana-pet__mouth-closed" d="M57 107C68 114 82 115 93 105" stroke="#544B46" strokeWidth="2.2" />
            <g className="morgana-pet__concern" stroke="#8CA6BD" strokeWidth="2.4"><path d="M29 30L44 35M95 27L117 22" /></g>
          </g>

          <g className="morgana-pet__scarf" stroke="#886914" strokeWidth="1.2">
            <path d="M91 140C105 137 120 131 133 133L125 142L119 151L102 145Z" fill={paint('gold')} />
            <path d="M102 141L121 139L112 149Z" fill="#D6A821" stroke="none" />
            <path d="M59 137C69 141 85 143 98 138L96 148L75 155L62 149Z" fill={paint('gold')} />
            <path d="M61 141L87 145L66 160L64 148Z" fill={paint('gold')} />
            <path d="M67 145L81 146L68 153" stroke="#FFE77C" strokeWidth="1.3" />
            <path d="M91 140L98 139L104 145L96 149L89 147Z" fill="#D9AD20" />
          </g>
          <g className="morgana-pet__arms">
            <path d="M55 155C44 159 42 169 49 177C60 183 76 180 89 171L95 162L83 157L65 166Z" fill={paint('body')} />
            <path d="M94 153C104 157 108 167 102 176C91 184 71 180 58 171L56 162L70 158L87 166Z" fill={paint('body')} />
            <path d="M86 159C91 153 99 153 104 158L101 165L92 169L85 166Z" fill={paint('white')} stroke="#8D9898" strokeWidth="1" />
            <path d="M54 158C47 157 43 163 46 167L55 173L62 168L61 162Z" fill={paint('white')} stroke="#8D9898" strokeWidth="1" />
            <path d="M63 171C77 179 87 179 99 174" stroke="#3E4B58" strokeWidth="1.1" />
            <path d="M48 160L56 165M95 157L98 162" stroke="#FFFFF8" strokeWidth="1.5" />
          </g>
        </g>
      </svg>
    </span>
  );
}
