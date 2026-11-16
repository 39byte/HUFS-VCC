import { useState } from 'react';
import rules from '../data/rules.json';
import { Course, Grade, GRADES, Profile, profileCumulative, Semester, semesterStats } from '../lib/gpa';

interface Props {
  profile: Profile;
  setProfile: (p: Profile) => void;
  remember: boolean;
  setRemember: (v: boolean) => void;
  onSubmit: () => void;
}

const field = 'min-h-11 rounded-lg border border-line bg-card px-3 text-base';
const LABELS = Array.from({ length: 8 }, (_, i) => 2019 + i).flatMap(y => [`${y}-1`, `${y}-2`]);
const nextLabel = (l?: string) => (l ? LABELS[Math.min(LABELS.indexOf(l) + 1, LABELS.length - 1)] : '2026-1');
const num = (v: string) => (v === '' ? undefined : Number(v));

export default function Input({ profile: p, setProfile: set, remember, setRemember, onSubmit }: Props) {
  const [mode, setMode] = useState<'semester' | 'quick'>(p.quick ? 'quick' : 'semester');
  const [tried, setTried] = useState(false);
  const patch = (x: Partial<Profile>) => set({ ...p, ...x });
  const setSem = (i: number, s: Semester) => patch({ semesters: p.semesters.map((v, j) => (j === i ? s : v)) });
  const setCourse = (i: number, k: number, c: Course) =>
    setSem(i, { ...p.semesters[i], courses: p.semesters[i].courses.map((v, j) => (j === k ? c : v)) });

  const cum = profileCumulative(p);
  const errors: Record<string, string> = {};
  if (mode === 'quick') {
    if (!p.quick || !(p.quick.gpa >= 0 && p.quick.gpa <= 4.5)) errors.quickGpa = '누적 평점은 0~4.5 사이로 입력해 주세요.';
    if (!p.quick || !(p.quick.credits > 0)) errors.quickCredits = '누적 학점은 0보다 커야 해요.';
  } else if (!p.semesters.some(s => s.courses.length)) errors.semesters = '과목을 하나 이상 입력해 주세요.';
  p.semesters.forEach((s, i) => {
    if (s.percent !== undefined && !(s.percent >= 0 && s.percent <= 100)) errors[`pct${i}`] = '백분위는 0~100 사이예요.';
  });
  if (p.targetGpa !== undefined && !(p.targetGpa > 0 && p.targetGpa <= 4.5)) errors.target = '목표 평점은 0~4.5 사이로 입력해 주세요.';
  if (p.targetBy === 'graduation' && !(p.gradCredits > cum.earned)) errors.grad = `졸업 학점은 지금까지 취득한 ${cum.earned}학점보다 커야 해요.`;
  if (!(p.perSemesterCredits > 0)) errors.perSem = '학기당 학점은 0보다 커야 해요.';
  const ok = Object.keys(errors).length === 0;
  const err = (k: string) => tried && errors[k] && <p id={`e-${k}`} role="alert" className="mt-1 text-sm text-red-700">{errors[k]}</p>;

  const switchMode = (m: 'semester' | 'quick') => {
    setMode(m);
    patch({ quick: m === 'quick' ? (p.quick ?? { gpa: 3.0, credits: 60 }) : undefined });
  };

  return (
    <form className="space-y-8" noValidate onSubmit={e => { e.preventDefault(); setTried(true); if (ok) onSubmit(); }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">성적 입력</h1>
        <p className="mt-1 text-sm text-muted">학점과 등급만 받아요. 이름·학번·과목명은 묻지 않아요.</p>
      </div>

      <div role="tablist" aria-label="입력 방식" className="grid grid-cols-2 rounded-lg bg-soft p-1">
        {([['semester', '학기별 입력'], ['quick', '빠른 입력 (누적만)']] as const).map(([m, t]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
            className={`min-h-11 rounded-md text-sm font-semibold ${mode === m ? 'bg-card shadow-sm' : 'text-muted'}`}>{t}</button>
        ))}
      </div>

      {mode === 'quick' ? (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">누적 성적</legend>
          <label className="block">
            <span className="text-sm font-medium">누적 평점 (4.5 만점)</span>
            <input type="number" inputMode="decimal" step="0.01" min={0} max={4.5} className={`${field} w-full mt-1`}
              value={p.quick?.gpa ?? ''} onChange={e => patch({ quick: { credits: p.quick?.credits ?? 0, gpa: Number(e.target.value) } })} />
            {err('quickGpa')}
          </label>
          <label className="block">
            <span className="text-sm font-medium">누적 취득 학점</span>
            <input type="number" inputMode="numeric" min={1} className={`${field} w-full mt-1`}
              value={p.quick?.credits ?? ''} onChange={e => patch({ quick: { gpa: p.quick?.gpa ?? 0, credits: Number(e.target.value) } })} />
            {err('quickCredits')}
          </label>
          <p className="sm:col-span-2 text-sm text-muted">빠른 입력은 누적 기준(우등졸업 등)만 판정해요. 장학금 대부분은 직전 학기 기준이라 학기별 입력에서 확인할 수 있어요.</p>
        </fieldset>
      ) : (
        <div className="space-y-4">
          {p.semesters.map((s, i) => {
            const st = semesterStats(s);
            return (
              <fieldset key={i} className="rounded-xl border border-line bg-card p-4 space-y-3">
                <legend className="sr-only">{s.label} 학기</legend>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">학기
                    <select className={field} value={s.label} onChange={e => setSem(i, { ...s, label: e.target.value })}>
                      {LABELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </label>
                  <span className="text-sm text-muted num">학기 평점 <b className="text-ink">{st.gpa.toFixed(2)}</b> · {st.earned}학점</span>
                  <button type="button" className="ml-auto text-sm underline text-muted min-h-11"
                    onClick={() => patch({ semesters: p.semesters.filter((_, j) => j !== i) })}>학기 삭제</button>
                </div>
                <ul className="space-y-2">
                  {s.courses.map((c, k) => (
                    <li key={k} className="flex flex-wrap items-center gap-2">
                      <span className="w-14 text-sm text-muted">과목 {k + 1}</span>
                      <select aria-label={`과목 ${k + 1} 학점`} className={field} value={c.credits}
                        onChange={e => setCourse(i, k, { ...c, credits: Number(e.target.value) })}>
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}학점</option>)}
                      </select>
                      <select aria-label={`과목 ${k + 1} 성적`} className={field} value={c.grade}
                        onChange={e => setCourse(i, k, { ...c, grade: e.target.value as Grade })}>
                        {GRADES.map(g => <option key={g}>{g}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-sm min-h-11">
                        <input type="checkbox" className="size-5" checked={!!c.retake}
                          onChange={e => setCourse(i, k, { ...c, retake: e.target.checked })} />재수강
                      </label>
                      <button type="button" aria-label={`과목 ${k + 1} 삭제`} className="min-h-11 min-w-11 text-muted hover:text-ink"
                        onClick={() => setSem(i, { ...s, courses: s.courses.filter((_, j) => j !== k) })}>✕</button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-end gap-4">
                  <button type="button" className="min-h-11 px-4 rounded-lg border border-line text-sm font-medium hover:bg-soft"
                    onClick={() => setSem(i, { ...s, courses: [...s.courses, { credits: 3, grade: 'A0' }] })}>+ 과목 추가</button>
                  <label className="block text-sm">
                    <span className="font-medium">성적증명서 학기 백분위 (선택)</span>
                    <input type="number" inputMode="decimal" min={0} max={100} placeholder="예: 85.3"
                      className={`${field} w-32 block mt-1`} aria-describedby={`e-pct${i}`}
                      value={s.percent ?? ''} onChange={e => setSem(i, { ...s, percent: num(e.target.value) })} />
                  </label>
                </div>
                {err(`pct${i}`)}
                <p className="text-xs text-muted">재수강 과목은 최고 A0로 계산해요. 대체된 이전 성적은 입력하지 않아도 돼요. (학교 공지로 확인 필요)</p>
              </fieldset>
            );
          })}
          <button type="button" className="w-full min-h-12 rounded-xl border-2 border-dashed border-line text-sm font-semibold text-muted hover:bg-soft"
            onClick={() => patch({ semesters: [...p.semesters, { label: nextLabel(p.semesters.at(-1)?.label), courses: [{ credits: 3, grade: 'A0' }] }] })}>
            + 학기 추가
          </button>
          {err('semesters')}
          <p className="text-sm text-muted num">누적 평점 <b className="text-ink">{cum.gpa.toFixed(2)}</b> · 취득 {cum.earned}학점</p>
        </div>
      )}

      <fieldset className="rounded-xl border border-line bg-card p-4 space-y-4">
        <legend className="px-1 font-semibold">목표와 설정</legend>
        <label className="block">
          <span className="text-sm font-medium">졸업 이수 학점</span>
          <div className="mt-1 flex flex-wrap gap-2">
            <select className={`${field} w-0 flex-1 min-w-0`} value={rules.gradCredits.options.some(o => o.credits === p.gradCredits) ? p.gradCredits : ''}
              onChange={e => e.target.value && patch({ gradCredits: Number(e.target.value) })}>
              {rules.gradCredits.options.map(o => <option key={o.label} value={o.credits}>{o.credits}학점 · {o.label}</option>)}
              <option value="">직접 입력</option>
            </select>
            <input type="number" inputMode="numeric" aria-label="졸업 이수 학점 직접 입력" className={`${field} w-24`}
              value={p.gradCredits} onChange={e => patch({ gradCredits: Number(e.target.value) })} />
          </div>
          {err('grad')}
        </label>
        <label className="block">
          <span className="text-sm font-medium">목표 평점 (선택)</span>
          <input type="number" inputMode="decimal" step="0.01" min={0} max={4.5} placeholder="예: 3.5"
            className={`${field} w-32 block mt-1`} value={p.targetGpa ?? ''} onChange={e => patch({ targetGpa: num(e.target.value) })} />
          {err('target')}
        </label>
        <div className="space-y-2">
          <span className="text-sm font-medium">목표 기간</span>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 min-h-11"><input type="radio" className="size-5" name="by" checked={p.targetBy === 'graduation'}
              onChange={() => patch({ targetBy: 'graduation' })} />졸업까지</label>
            <label className="flex items-center gap-2 min-h-11"><input type="radio" className="size-5" name="by" checked={p.targetBy !== 'graduation'}
              onChange={() => patch({ targetBy: { semestersLeft: 2 } })} />
              {p.targetBy === 'graduation' ? 'N학기 후' : (
                <><input type="number" min={1} max={12} aria-label="남은 학기 수" className={`${field} w-20`} value={p.targetBy.semestersLeft}
                  onChange={e => patch({ targetBy: { semestersLeft: Math.max(1, Number(e.target.value)) } })} />학기 후</>
              )}
            </label>
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-medium">학기당 수강 학점</span>
          <input type="number" inputMode="numeric" min={1} className={`${field} w-24 block mt-1`} value={p.perSemesterCredits}
            onChange={e => patch({ perSemesterCredits: Number(e.target.value) })} />
          {p.perSemesterCredits > rules.semesterCredits.max && (
            <p className="mt-1 text-sm text-gold">학기당 최대 {rules.semesterCredits.max}학점을 넘어요. (학교 공지로 확인 필요)</p>
          )}
          {err('perSem')}
        </label>
        <label className="block">
          <span className="text-sm font-medium">한 학기 등록금 (선택, 원)</span>
          <input type="number" inputMode="numeric" min={0} step={10000} placeholder="예: 4000000"
            className={`${field} w-40 block mt-1`} value={p.tuition ?? ''} onChange={e => patch({ tuition: num(e.target.value) })} />
          <span className="mt-1 block text-xs text-muted">입력하면 "등록금 ○%" 장학금을 금액으로 바꿔 보여 줘요.</span>
        </label>
        <div className="space-y-2">
          <span className="text-sm font-medium">메시지 강도</span>
          <div className="grid grid-cols-2 rounded-lg bg-soft p-1 max-w-xs">
            {([['mild', '순한맛'], ['spicy', '매운맛']] as const).map(([t, l]) => (
              <button key={t} type="button" aria-pressed={p.tone === t} onClick={() => patch({ tone: t })}
                className={`min-h-11 rounded-md text-sm font-semibold ${p.tone === t ? 'bg-card shadow-sm' : 'text-muted'}`}>{l}</button>
            ))}
          </div>
        </div>
        <label className="flex items-start gap-2 min-h-11">
          <input type="checkbox" className="size-5 mt-0.5" checked={remember} onChange={e => setRemember(e.target.checked)} />
          <span><span className="font-medium">이 기기에 저장</span><span className="block text-xs text-muted">켜면 이 브라우저에만 저장돼요. 끄면 바로 지워져요.</span></span>
        </label>
      </fieldset>

      {tried && !ok && <p role="alert" className="text-sm text-red-700">입력값을 확인해 주세요.</p>}
      <button type="submit" className="w-full min-h-12 rounded-lg bg-navy text-white font-semibold hover:bg-ink transition-colors">
        결과 보기
      </button>
    </form>
  );
}
