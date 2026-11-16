import { describe, expect, it } from 'vitest';
import { Course, Profile, stats, truncate } from './gpa';
import { computeTarget, retakeSimulation } from './target';
import { findMissed, lostBelow, Opportunity, recovery } from './opportunities';

const c = (grade: Course['grade'], credits = 3, retake = false): Course => ({ grade, credits, retake });
const base: Omit<Profile, 'semesters'> = { gradCredits: 126, targetBy: 'graduation', perSemesterCredits: 18, tone: 'mild' };

describe('gpa', () => {
  it('P/NP 제외, F는 0점 포함', () => {
    const s = stats([c('A+'), c('F'), c('P'), c('NP')]);
    expect(s.gpa).toBe(2.25);
    expect(s.gpaCredits).toBe(6);
    expect(s.earned).toBe(6); // A+ 3 + P 3
  });
  it('절사 (반올림 아님)', () => {
    expect(truncate(3.4999)).toBe(3.49);
    expect(truncate(3.5)).toBe(3.5);
    expect(stats([c('A0'), c('B+'), c('B+')]).gpa).toBe(3.66); // 3.666…
  });
  it('재수강 상한 A0', () => {
    expect(stats([c('A+', 3, true)]).gpa).toBe(4.0);
  });
});

describe('target', () => {
  it('R=0', () => expect(computeTarget(126, 3.0, 0, 3.5).kind).toBe('none'));
  it('달성 중', () => expect(computeTarget(60, 3.8, 66, 3.5).kind).toBe('achieved'));
  it('가능', () => {
    const r = computeTarget(60, 3.0, 60, 3.5);
    expect(r.kind).toBe('possible');
    if (r.kind === 'possible') expect(r.required).toBeCloseTo(4.0);
  });
  it('불가 + 최대 도달치', () => {
    const r = computeTarget(100, 2.0, 20, 4.0);
    expect(r.kind).toBe('impossible');
    if (r.kind === 'impossible') expect(r.maxReachable).toBe(2.41); // (200+90)/120 = 2.4166
  });
  it('재수강: C+ 미만만, 21학점 한도', () => {
    const r = retakeSimulation([c('A0'), c('F'), c('D0')]);
    expect(r.usedCredits).toBe(6);
    expect(r.gpa).toBe(4.0);
  });
});

const opp = (o: Partial<Opportunity> & Pick<Opportunity, 'id' | 'criteria' | 'category'>): Opportunity =>
  ({ name: o.id, url: 'x', source: 'x', verifiedAt: 'x', ...o });

describe('opportunities', () => {
  const opps = [
    opp({ id: 'prev', category: 'scholarship', amount: 1_000_000, criteria: { basis: 'prevSemester', minGpa: 3.5 } }),
    opp({ id: 'cum', category: 'scholarship', amount: 500_000, criteria: { basis: 'cumulative', minGpa: 3.5 } }),
    opp({ id: 'extra', category: 'extracurricular', amount: 9_999_999, criteria: { basis: 'prevSemester', minGpa: 3.5 } }),
    opp({ id: 'nat', category: 'national', criteria: { basis: 'prevSemester', minPercent: 80, minCredits: 12 } }),
  ];
  // 1학기 4.5(누적 높음), 2학기 3.0 → 학기 기준은 미달, 누적(3.75)은 통과
  const p: Profile = { ...base, semesters: [
    { label: '2026-1', courses: [c('A+'), c('A+'), c('A+'), c('A+')] },
    { label: '2026-2', courses: [c('B0'), c('B0'), c('B0'), c('B0')] },
  ] };

  it('prevSemester vs cumulative 판정', () => {
    const ids = findMissed(p, opps).missed.map(m => m.o.id);
    expect(ids).toContain('prev');
    expect(ids).not.toContain('cum');
    // 누적 기준은 최신 시점에서만 판정 (과거 학기 누적 미달로 중복 집계 안 함)
    const rev = { ...p, semesters: [...p.semesters].reverse() };
    expect(findMissed(rev, opps).missed.map(m => m.o.id)).not.toContain('cum');
  });
  it('금액 합산은 비교과 제외, 비교과는 건수에만', () => {
    const r = findMissed(p, opps);
    expect(r.total).toBe(1_000_000);
    expect(r.count).toBe(2);
  });
  it('백분위 미입력이면 국가장학금 판정 안 함', () => {
    expect(findMissed(p, opps).unknown.map(o => o.id)).toEqual(['nat']);
    const withPct = { ...p, semesters: p.semesters.map(s => ({ ...s, percent: 75 })) };
    expect(findMissed(withPct, opps).missed.map(m => m.o.id)).toContain('nat');
  });
  it('같은 group은 학기당 가장 큰 것 하나만, 등록금 환산', () => {
    const g = [
      opp({ id: 'a', category: 'scholarship', group: 'm', tuitionPercent: 40, criteria: { basis: 'prevSemester', minGpa: 3.5 } }),
      opp({ id: 'b', category: 'scholarship', group: 'm', tuitionPercent: 100, criteria: { basis: 'prevSemester', minGpa: 3.5 } }),
    ];
    const one = { ...p, semesters: [p.semesters[1]], tuition: 4_000_000 };
    const r = findMissed(one, g);
    expect(r.missed.map(m => m.o.id)).toEqual(['b']);
    expect(r.total).toBe(4_000_000);
    expect(findMissed({ ...one, tuition: undefined }, g).percentOnly).toHaveLength(1);
  });
  it('회복 경로·하락 시뮬', () => {
    expect(recovery(findMissed(p, opps).missed).map(o => o.id)).toEqual(['prev', 'extra']);
    expect(lostBelow(3.6, 3.4, opps).map(o => o.id)).toEqual(['prev', 'extra']);
    expect(lostBelow(3.6, 3.5, opps)).toEqual([]);
  });
});
