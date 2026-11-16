import { useEffect, useState } from 'react';
import rules from './data/rules.json';
import { Profile } from './lib/gpa';
import Landing from './pages/Landing';
import Input from './pages/Input';
import Result from './pages/Result';

const KEY = 'gpa-pnl-v1';
type Route = 'landing' | 'input' | 'result';

export const emptyProfile = (): Profile => ({
  semesters: [{ label: '2026-1', courses: [{ credits: 3, grade: 'A0' }] }],
  gradCredits: rules.gradCredits.default,
  targetBy: 'graduation',
  perSemesterCredits: rules.semesterCredits.default,
  tone: 'mild',
});

export const hasData = (p: Profile) => !!p.quick || p.semesters.some(s => s.courses.length > 0);

function load(): Profile | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Profile) : null; } catch { return null; }
}

const routeOf = (): Route => (location.hash === '#/input' ? 'input' : location.hash === '#/result' ? 'result' : 'landing');
export const go = (r: Route) => { location.hash = r === 'landing' ? '#/' : `#/${r}`; };

export default function App() {
  const [route, setRoute] = useState<Route>(routeOf);
  const [saved] = useState(load);
  const [profile, setProfile] = useState<Profile>(saved ?? emptyProfile());
  const [submitted, setSubmitted] = useState(!!saved); // 입력 완료 여부 (메모리)
  const [remember, setRemember] = useState(!!saved);

  useEffect(() => {
    const on = () => { setRoute(routeOf()); window.scrollTo(0, 0); document.getElementById('main')?.focus(); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  // "이 기기에 저장" ON일 때만 localStorage. 서버 전송 없음.
  useEffect(() => {
    try {
      if (remember && submitted) localStorage.setItem(KEY, JSON.stringify(profile));
      else localStorage.removeItem(KEY);
    } catch { /* 저장 불가 환경: 메모리만 사용 */ }
  }, [remember, submitted, profile]);

  return (
    <div className="min-h-dvh flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-3 focus:bg-card">본문으로 건너뛰기</a>
      <header className="border-b border-line bg-card">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => go('landing')} className="font-bold tracking-tight">학점 손익계산서</button>
          <span className="text-xs text-muted">익명 · 브라우저 안에서만 계산</span>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 outline-none">
        {route === 'landing' && <Landing profile={submitted && hasData(profile) ? profile : null} />}
        {route === 'input' && (
          <Input profile={profile} setProfile={setProfile} remember={remember} setRemember={setRemember}
            onSubmit={() => { setSubmitted(true); go('result'); }} />
        )}
        {route === 'result' && <Result profile={profile} setProfile={setProfile} />}
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  const l = rules.links;
  return (
    <footer className="border-t border-line bg-card text-sm text-muted">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-3">
        <p className="font-semibold text-ink">혼자 고민하지 않아도 돼요</p>
        <ul className="space-y-1">
          <li>
            학생상담센터 · 교수학습개발원(튜터링):{' '}
            {l.counseling ? <a className="underline" href={l.counseling}>바로가기</a>
              : <a className="underline" href={l.hufsHome} target="_blank" rel="noreferrer">한국외대 홈페이지에서 찾기</a>}
          </li>
          {rules.contacts.map(c => (
            <li key={c.tel}>{c.label} (규정 문의): <a className="underline num" href={`tel:${c.tel}`}>{c.tel}</a></li>
          ))}
        </ul>
        <p className="text-xs">
          기준 출처: <a className="underline" href={l.scholarship} target="_blank" rel="noreferrer">교내장학</a> ·{' '}
          <a className="underline" href={l.kosafType1} target="_blank" rel="noreferrer">한국장학재단</a> ·{' '}
          <a className="underline" href={l.academicWarning} target="_blank" rel="noreferrer">학사경고</a> ·{' '}
          <a className="underline" href={l.graduation} target="_blank" rel="noreferrer">졸업</a> · 기준 확인일 {rules.updatedAt}.
          학번·캠퍼스에 따라 다를 수 있으니 원문을 확인하세요.
        </p>
      </div>
    </footer>
  );
}
