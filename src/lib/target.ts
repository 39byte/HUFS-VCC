import rules from '../data/rules.json';
import { Course, gradePoint, Profile, profileCumulative, truncate } from './gpa';

const MAX = rules.scale;

export type TargetResult =
  | { kind: 'none' }
  | { kind: 'achieved'; required: number }
  | { kind: 'possible'; required: number; semesters: number }
  | { kind: 'impossible'; required: number; maxReachable: number };

/** C: 반영 학점, G: 현재 누적, R: 남은 학점, T: 목표 */
export function computeTarget(C: number, G: number, R: number, T: number, perSem = 18): TargetResult {
  if (R <= 0) return { kind: 'none' };
  const required = (T * (C + R) - G * C) / R;
  if (required <= G) return { kind: 'achieved', required: Math.max(0, required) };
  if (required <= MAX) return { kind: 'possible', required, semesters: Math.ceil(R / perSem) };
  return { kind: 'impossible', required, maxReachable: truncate((G * C + MAX * R) / (C + R)) };
}

export function remainingCredits(p: Profile, earned: number) {
  return p.targetBy === 'graduation' ? p.gradCredits - earned : p.targetBy.semestersLeft * p.perSemesterCredits;
}

export function profileTarget(p: Profile, T: number): TargetResult {
  const cum = profileCumulative(p);
  return computeTarget(cum.gpaCredits, cum.gpa, remainingCredits(p, cum.earned), T, p.perSemesterCredits);
}

/**
 * 재수강 시뮬레이션 (rules.retake.verified=false → 화면에 "확인 필요")
 * C+ 미만 과목을 평점 낮은 순으로 21학점 한도까지 A0로 바꿨을 때의 누적 평점.
 */
export function retakeSimulation(courses: Course[]) {
  const cutoff = (rules.gradePoints as Record<string, number>)[rules.retake.eligibleBelow];
  const cap = (rules.gradePoints as Record<string, number>)[rules.retake.maxGrade];
  const graded = courses.map(c => ({ c, p: gradePoint(c) })).filter(x => x.p !== null) as { c: Course; p: number }[];
  const candidates = graded.filter(x => x.p < cutoff && !x.c.retake).sort((a, b) => a.p - b.p);
  let budget = rules.retake.maxTotalCredits, gain = 0, used = 0;
  for (const x of candidates) {
    if (x.c.credits > budget) continue;
    budget -= x.c.credits; used += x.c.credits; gain += (cap - x.p) * x.c.credits;
  }
  const C = graded.reduce((s, x) => s + x.c.credits, 0);
  const sum = graded.reduce((s, x) => s + x.p * x.c.credits, 0);
  return { usedCredits: used, gpa: C ? truncate((sum + gain) / C) : 0 };
}
