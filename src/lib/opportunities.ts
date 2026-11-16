import data from '../data/opportunities.json';
import { cumulativeStats, Profile, semesterStats, Stats, truncate } from './gpa';

export interface Opportunity {
  id: string;
  name: string;
  category: 'scholarship' | 'extracurricular' | 'national';
  group?: string;          // 같은 group은 학기당 1개만 (동시 수혜 불가)
  amount?: number;         // 원/학기
  tuitionPercent?: number; // 등록금 ○%
  amountNote?: string;
  criteria: { basis: 'prevSemester' | 'cumulative'; minGpa?: number; minPercent?: number; minCredits?: number };
  otherRequirements?: string[];
  period?: string;
  url: string;
  source: string;
  verifiedAt: string;
}

export const OPPORTUNITIES = data as Opportunity[];

export interface Gap { kind: 'gpa' | 'credits' | 'percent'; need: number; have: number; short: number }
export type Verdict = { status: 'pass' } | { status: 'fail'; gaps: Gap[] } | { status: 'unknown' };

export function evaluate(o: Opportunity, s: Stats): Verdict {
  const { minGpa, minCredits, minPercent } = o.criteria;
  const gaps: Gap[] = [];
  if (minGpa !== undefined && s.gpa < minGpa) gaps.push({ kind: 'gpa', need: minGpa, have: s.gpa, short: truncate(minGpa - s.gpa + 1e-9) });
  if (minCredits !== undefined && s.earned < minCredits) gaps.push({ kind: 'credits', need: minCredits, have: s.earned, short: minCredits - s.earned });
  if (minPercent !== undefined) {
    if (s.percent === undefined) return gaps.length ? { status: 'fail', gaps } : { status: 'unknown' };
    if (s.percent < minPercent) gaps.push({ kind: 'percent', need: minPercent, have: s.percent, short: truncate(minPercent - s.percent + 1e-9) });
  }
  return gaps.length ? { status: 'fail', gaps } : { status: 'pass' };
}

/** 금액 환산. 등록금 미입력이면 tuitionPercent 항목은 null */
export function amountOf(o: Opportunity, tuition?: number): number | null {
  if (o.amount !== undefined) return o.amount;
  if (o.tuitionPercent !== undefined && tuition) return Math.round((tuition * o.tuitionPercent) / 100);
  return null;
}

export interface Missed { o: Opportunity; semester: string; gaps: Gap[]; amount: number | null }

export interface MissedReport {
  missed: Missed[];
  total: number;              // 금액 합 (원)
  count: number;
  percentOnly: Missed[];      // 등록금 미입력으로 금액 환산 못 한 항목
  unknown: Opportunity[];     // 판정 불가 (백분위 미입력, 빠른 입력 모드의 학기 기준)
}

/** 최근 1년 = 최근 2개 학기 기준 놓친 기회 */
export function findMissed(p: Profile, opps = OPPORTUNITIES): MissedReport {
  const missed: Missed[] = [];
  const unknown = new Map<string, Opportunity>();

  if (p.quick) {
    const s: Stats = { gpa: truncate(p.quick.gpa), gpaCredits: p.quick.credits, earned: p.quick.credits };
    for (const o of opps) {
      if (o.criteria.basis !== 'cumulative') { unknown.set(o.id, o); continue; }
      const v = evaluate(o, s);
      if (v.status === 'fail') missed.push({ o, semester: '누적', gaps: v.gaps, amount: amountOf(o, p.tuition) });
    }
  } else {
    const n = p.semesters.length;
    for (let i = Math.max(0, n - 2); i < n; i++) {
      const sem = p.semesters[i];
      const prev = semesterStats(sem), cum = cumulativeStats(p.semesters, i);
      const groupBest = new Map<string, Missed>();
      for (const o of opps) {
        if (o.criteria.basis === 'cumulative' && i !== n - 1) continue; // 누적 기준은 현재 시점 1회만
        const v = evaluate(o, o.criteria.basis === 'prevSemester' ? prev : cum);
        if (v.status === 'unknown') { unknown.set(o.id, o); continue; }
        if (v.status !== 'fail') continue;
        const m: Missed = { o, semester: sem.label, gaps: v.gaps, amount: amountOf(o, p.tuition) };
        if (!o.group) { missed.push(m); continue; }
        const cur = groupBest.get(o.group);
        if (!cur || (o.tuitionPercent ?? o.amount ?? 0) > (cur.o.tuitionPercent ?? cur.o.amount ?? 0)) groupBest.set(o.group, m);
      }
      missed.push(...groupBest.values());
    }
  }

  const money = missed.filter(m => m.o.category !== 'extracurricular');
  return {
    missed,
    total: money.reduce((s, m) => s + (m.amount ?? 0), 0),
    count: missed.length,
    percentOnly: money.filter(m => m.amount === null && m.o.tuitionPercent !== undefined),
    unknown: [...unknown.values()],
  };
}

/** 회복 경로: 다음 학기에 되찾을 수 있는 것, 쉬운 것부터 */
export function recovery(missed: Missed[]) {
  const seen = new Map<string, Opportunity>();
  for (const m of missed) seen.set(m.o.id, m.o);
  return [...seen.values()]
    .filter(o => o.criteria.basis === 'prevSemester' && (o.criteria.minGpa ?? 0) <= 4.5)
    .sort((a, b) => (a.criteria.minGpa ?? 0) - (b.criteria.minGpa ?? 0));
}

/** 하락 시뮬: 학기 평점이 v 미만이 되면 잃는 것 (지금은 유지 중인 것만) */
export function lostBelow(current: number, v: number, opps = OPPORTUNITIES) {
  return opps.filter(o => o.criteria.basis === 'prevSemester' && o.criteria.minGpa !== undefined
    && o.criteria.minGpa <= current && v < o.criteria.minGpa);
}

/** 하락 시뮬 구간 (현재 이하 기준값, 내림차순) */
export const dropThresholds = (current: number, opps = OPPORTUNITIES) =>
  [...new Set(opps.filter(o => o.criteria.basis === 'prevSemester').map(o => o.criteria.minGpa)
    .filter((g): g is number => g !== undefined && g <= current))].sort((a, b) => b - a);
