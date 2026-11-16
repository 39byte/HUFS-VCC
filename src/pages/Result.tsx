import { ReactNode, useState } from 'react';
import { go, hasData } from '../App';
import rules from '../data/rules.json';
import { copy, gapText, won } from '../lib/copy';
import { Profile, profileCumulative, semesterStats } from '../lib/gpa';
import { dropThresholds, findMissed, lostBelow, Missed, Opportunity, recovery } from '../lib/opportunities';
import { profileTarget, retakeSimulation } from '../lib/target';

const CATS = [['scholarship', '장학금'], ['extracurricular', '비교과·졸업'], ['national', '국가 지원']] as const;
const Ext = ({ href, children }: { href: string; children: ReactNode }) =>
  <a className="underline text-navy" href={href} target="_blank" rel="noreferrer">{children}</a>;
const Tag = () => <span className="ml-1 rounded bg-gold-soft px-1.5 py-0.5 text-xs text-gold">학교 공지로 확인 필요</span>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function Result({ profile: p, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [tab, setTab] = useState<(typeof CATS)[number][0]>('scholarship');
  if (!hasData(p)) return (
    <div className="space-y-4">
      <p>아직 입력한 성적이 없어요.</p>
      <button onClick={() => go('input')} className="min-h-12 px-6 rounded-lg bg-navy text-white font-semibold">성적 입력하기</button>
    </div>
  );

  const t = p.tone;
  const r = findMissed(p);
  const cum = profileCumulative(p);
  const last = p.quick ? null : p.semesters.at(-1)!;
  const lastStats = last && semesterStats(last);
  const rec = recovery(r.missed);

  return (
    <div className="space-y-12">
      {/* 1. 히어로 */}
      <section className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-ink text-white p-6">
            <p className="text-sm text-slate-300">{copy.heroMoney(t)}</p>
            <p className="mt-2 text-4xl font-bold num">{won(r.total)}</p>
            {r.percentOnly.length > 0 && (
              <p className="mt-2 text-sm text-slate-300">+ 등록금 {Math.max(...r.percentOnly.map(m => m.o.tuitionPercent!))}% 상당 (등록금 입력 시 금액 환산)</p>
            )}
          </div>
          <div className="rounded-xl bg-card border border-line p-6">
            <p className="text-sm text-muted">{copy.heroCount(t)}</p>
            <p className="mt-2 text-4xl font-bold num">{r.count}건</p>
            <p className="mt-2 text-sm text-muted">{p.quick ? '누적 기준' : `최근 ${Math.min(2, p.semesters.length)}개 학기 기준`}</p>
          </div>
        </div>
        <p className="text-xs text-muted">추정치예요. 성적 기준 미달로 지원 자격이 없었던 기회의 합계이며 선발을 보장하지 않아요. 성적우수 장학은 학기당 가장 큰 1개만 합산했어요.</p>
        {rec.length > 0 && <a href="#recovery" className="inline-block min-h-11 py-2 font-semibold text-navy underline">되찾는 경로 바로 보기 ↓</a>}
      </section>

      {/* 2. 놓친 기회 리포트 */}
      <Section title="놓친 기회 리포트">
        <div role="tablist" aria-label="기회 종류" className="grid grid-cols-3 rounded-lg bg-soft p-1">
          {CATS.map(([c, l]) => (
            <button key={c} role="tab" aria-selected={tab === c} onClick={() => setTab(c)}
              className={`min-h-11 rounded-md text-sm font-semibold ${tab === c ? 'bg-card shadow-sm' : 'text-muted'}`}>
              {l} <span className="num">{r.missed.filter(m => m.o.category === c).length}</span>
            </button>
          ))}
        </div>
        <ul className="space-y-3" role="tabpanel">
          {r.missed.filter(m => m.o.category === tab).map((m, i) => <MissedItem key={i} m={m} tone={t} />)}
          {r.unknown.filter(o => o.category === tab).map(o => (
            <li key={o.id} className="rounded-xl border border-dashed border-line bg-card p-4 text-sm">
              <p className="font-semibold">{o.name}</p>
              <p className="mt-1 text-muted">{p.quick ? '학기별 입력 시 확인 가능' : '성적증명서 학기 백분위를 입력하면 확인할 수 있어요.'} · <Ext href={o.url}>원문</Ext></p>
            </li>
          ))}
          {r.missed.every(m => m.o.category !== tab) && r.unknown.every(o => o.category !== tab) && (
            <li className="text-sm text-muted">이 분류에서는 성적 때문에 놓친 기회가 없어요.</li>
          )}
        </ul>
      </Section>

      {/* 3. 회복 경로 */}
      <section id="recovery" className="space-y-4 rounded-xl border-2 border-navy bg-card p-5 scroll-mt-4">
        <h2 className="text-lg font-bold tracking-tight">다음 학기에 되찾는 것</h2>
        {rec.length ? (
          <ol className="space-y-3">
            {rec.map(o => (
              <li key={o.id} className="flex gap-3">
                <span className="num font-bold text-navy w-12 shrink-0">{o.criteria.minGpa?.toFixed(2) ?? `${o.criteria.minPercent}점`}</span>
                <span>
                  <b>{o.name}</b>{o.amountNote && <span className="text-sm text-muted"> · {o.amountNote}</span>}
                  <span className="block text-sm text-muted">
                    {o.criteria.minGpa !== undefined ? copy.recover(t, o.criteria.minGpa) : `다음 학기 백분위 ${o.criteria.minPercent}점 이상이면 다시 지원할 수 있어요.`}
                    {o.criteria.minCredits && ` (${o.criteria.minCredits}학점 이상 이수)`}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : <p className="text-muted">놓친 학기 기준 기회가 없어요. 지금 페이스를 지키면 돼요.</p>}
        <p className="text-sm">공부 방법이 막막하면 <Ext href={rules.links.learningSupport ?? rules.links.hufsHome}>교수학습개발원·튜터링</Ext>을 찾아보세요.</p>
      </section>

      {/* 4. 하락 시뮬레이션 */}
      {lastStats && <DropSim current={lastStats.gpa} earned={lastStats.earned} label={last!.label} tone={t} />}

      {/* 5. 목표 역산 */}
      <TargetSection p={p} cumGpa={cum.gpa} setProfile={setProfile} />

      <button onClick={() => go('input')} className="w-full min-h-12 rounded-lg border border-line bg-card font-semibold hover:bg-soft">성적 수정하기</button>
    </div>
  );
}

function MissedItem({ m, tone }: { m: Missed; tone: Profile['tone'] }) {
  const g = m.gaps[0];
  return (
    <li className="rounded-xl border border-line bg-card p-4 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{m.o.name}</p>
        <p className="num text-sm font-semibold">{m.amount ? won(m.amount) : m.o.amountNote ?? '금액 없음'}</p>
      </div>
      <p className="text-sm">{copy.missed(tone, gapText(g), m.amount)}</p>
      <dl className="grid grid-cols-3 gap-2 text-sm num">
        {m.gaps.map(x => (
          <div key={x.kind} className="contents">
            <div><dt className="text-xs text-muted">요구</dt><dd>{x.kind === 'credits' ? `${x.need}학점` : x.need.toFixed(2)}</dd></div>
            <div><dt className="text-xs text-muted">내 값 ({m.semester})</dt><dd>{x.kind === 'credits' ? `${x.have}학점` : x.have.toFixed(2)}</dd></div>
            <div><dt className="text-xs text-muted">부족</dt><dd className="font-semibold">{gapText(x)}</dd></div>
          </div>
        ))}
      </dl>
      {m.o.otherRequirements && <p className="text-xs text-muted">성적 외 요건 별도 확인 필요: {m.o.otherRequirements.join(' · ')}</p>}
      <p className="text-xs text-muted"><Ext href={m.o.url}>원문 공지</Ext> · {m.o.source} · 확인일 {m.o.verifiedAt}</p>
    </li>
  );
}

function DropSim({ current, earned, label, tone }: { current: number; earned: number; label: string; tone: Profile['tone'] }) {
  const [v, setV] = useState(current);
  const lost = lostBelow(current, v);
  const steps = dropThresholds(current);
  const creditSteps = [...new Set(lostBelow(current, -1).map(o => o.criteria.minCredits).filter((n): n is number => !!n && n <= earned))].sort((a, b) => b - a);
  const warn = rules.academicWarning.below;
  return (
    <Section title="하락 시뮬레이션">
      <p className="text-sm text-muted">{label} 학기 평점 <b className="text-ink num">{current.toFixed(2)}</b>에서 내려가면 무엇을 잃는지 보여 줘요.</p>
      <label className="block">
        <span className="text-sm font-medium">학기 평점이 <b className="num">{v.toFixed(2)}</b>라면</span>
        <input type="range" min={0} max={current} step={0.01} value={v} onChange={e => setV(Number(e.target.value))}
          className="w-full mt-2 accent-navy h-11" aria-valuetext={`학기 평점 ${v.toFixed(2)}`} />
      </label>
      <div aria-live="polite" className="rounded-xl border border-line bg-card p-4 space-y-2">
        {lost.length ? (
          <>
            <p className="text-sm">{copy.drop(tone)}</p>
            <ul className="text-sm list-disc pl-5">{lost.map(o => <li key={o.id}>{o.name} <span className="text-muted">({o.criteria.minGpa?.toFixed(2)} 기준)</span></li>)}</ul>
          </>
        ) : <p className="text-sm text-muted">이 구간에서는 잃는 기회가 없어요.</p>}
        {v < warn && <p className="text-sm text-gold font-semibold">학기 평점 {warn} 미만은 학사경고 기준이에요. 여기는 꼭 지키자. (누적 {rules.academicWarning.dismissAtCount}회 시 제적 · <Ext href={rules.links.academicWarning}>규정</Ext>)</p>}
      </div>
      <ul className="text-sm space-y-1">
        {steps.map(s => <li key={s} className="num">평점 <b>{s.toFixed(2)}</b> 미만 → {lostBelow(current, s - 0.001).filter(o => o.criteria.minGpa === s).map(o => o.name).join(', ')}</li>)}
        {creditSteps.map(n => <li key={n} className="num">이수 학점 <b>{n}</b> 미만 → {lostBelow(current, -1).filter(o => o.criteria.minCredits === n).map(o => o.name).join(', ')}</li>)}
        <li className="num">학기 평점 <b>{warn.toFixed(2)}</b> 미만 → 학사경고</li>
        <li className="num">누적 평점 <b>{rules.graduation.minGpa.toFixed(2)}</b> 미만 → 졸업 불가 (<Ext href={rules.links.graduation}>졸업 규정</Ext>)</li>
      </ul>
    </Section>
  );
}

function TargetSection({ p, cumGpa, setProfile }: { p: Profile; cumGpa: number; setProfile: (p: Profile) => void }) {
  const belowGrad = cumGpa < rules.graduation.minGpa;
  const T = p.targetGpa ?? (belowGrad ? rules.graduation.minGpa : undefined);
  const res = T !== undefined ? profileTarget(p, T) : null;
  const retake = p.quick ? null : retakeSimulation(p.semesters.flatMap(s => s.courses));
  const l = rules.links;
  return (
    <Section title="목표 역산">
      {belowGrad && <p className="rounded-lg bg-gold-soft p-3 text-sm text-gold">누적 평점이 졸업 최저 기준 {rules.graduation.minGpa.toFixed(2)} 미만이에요. 졸업 가능 평점까지 남은 학기 평균을 먼저 계산해 볼게요.</p>}
      <label className="flex items-center gap-2">
        <span className="text-sm font-medium">목표 평점</span>
        <input type="number" inputMode="decimal" step="0.01" min={0} max={4.5} placeholder="예: 3.5"
          className="min-h-11 w-28 rounded-lg border border-line bg-card px-3"
          value={p.targetGpa ?? ''} onChange={e => setProfile({ ...p, targetGpa: e.target.value === '' ? undefined : Number(e.target.value) })} />
        <span className="text-sm text-muted num">현재 누적 {cumGpa.toFixed(2)}</span>
      </label>
      {!res && <p className="text-sm text-muted">목표 평점을 넣으면 남은 학기에 필요한 평균을 계산해요.</p>}
      {res?.kind === 'none' && <p>남은 학점이 없어요. 졸업 학점이나 기간 설정을 확인해 주세요.</p>}
      {res?.kind === 'achieved' && <p className="font-semibold">현재 페이스를 유지하면 {T!.toFixed(2)}을 달성해요.</p>}
      {res?.kind === 'possible' && (
        <div className="space-y-3">
          <p>남은 학기 평균 <b className="num text-2xl text-navy">{res.required.toFixed(2)}</b> 이상이 필요해요.</p>
          <table className="w-full text-sm num border-collapse">
            <thead><tr className="text-left text-muted border-b border-line"><th className="py-2 font-medium">남은 학기</th><th className="py-2 font-medium">필요 평균</th><th className="py-2 font-medium">학점</th></tr></thead>
            <tbody>
              {Array.from({ length: res.semesters }, (_, i) => (
                <tr key={i} className="border-b border-line"><td className="py-2">{i + 1}학기 후</td><td>{res.required.toFixed(2)}</td><td>{p.perSemesterCredits}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {res?.kind === 'impossible' && (
        <div className="space-y-3 rounded-xl border border-line bg-card p-4">
          <p className="font-semibold">{copy.impossible(p.tone)}</p>
          <p className="text-sm">필요한 평균은 <span className="num">{res.required.toFixed(2)}</span>로 4.5를 넘어요. 남은 학기를 전부 4.5로 채우면 최대 <b className="num">{res.maxReachable.toFixed(2)}</b>까지 갈 수 있어요.</p>
          {retake && retake.usedCredits > 0 && (
            <p className="text-sm">C+ 미만 과목 {retake.usedCredits}학점을 재수강해 A0를 받으면 현재 누적이 <b className="num">{retake.gpa.toFixed(2)}</b>까지 올라가요.<Tag /></p>
          )}
          <p className="text-sm">재수강 과목 찾기: <Ext href={l.courseCatalogSeoul}>서울캠퍼스 수강편람</Ext> · <Ext href={l.courseCatalogGlobal}>글로벌캠퍼스 수강편람</Ext> · <Ext href={l.gradeRules}>성적 규정</Ext></p>
        </div>
      )}
      {p.perSemesterCredits > rules.semesterCredits.max && <p className="text-xs text-muted">학기당 {p.perSemesterCredits}학점 기준으로 계산했어요.<Tag /></p>}
    </Section>
  );
}
