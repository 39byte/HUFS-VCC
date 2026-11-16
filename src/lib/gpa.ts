import rules from '../data/rules.json';

export type Grade = 'A+' | 'A0' | 'B+' | 'B0' | 'C+' | 'C0' | 'D+' | 'D0' | 'F' | 'P' | 'NP';
export const GRADES: Grade[] = ['A+', 'A0', 'B+', 'B0', 'C+', 'C0', 'D+', 'D0', 'F', 'P', 'NP'];

export interface Course { credits: number; grade: Grade; retake?: boolean }
export interface Semester { label: string; courses: Course[]; percent?: number }

export interface Profile {
  semesters: Semester[];
  quick?: { gpa: number; credits: number }; // 빠른 입력: 누적만
  gradCredits: number;
  targetGpa?: number;
  targetBy: 'graduation' | { semestersLeft: number };
  perSemesterCredits: number;
  tuition?: number; // 학기 등록금 (선택)
  tone: 'spicy' | 'mild';
}

export interface Stats {
  gpa: number;         // 절사값
  gpaCredits: number;  // 평점 반영 학점 (P/NP 제외)
  earned: number;      // 취득 학점 (F/NP 제외)
  percent?: number;
}

const POINTS = rules.gradePoints as Record<string, number>;
const RETAKE_CAP = POINTS[rules.retake.maxGrade];

/** 소수 셋째 자리 이하 절사 (학교 규정, 반올림 아님) */
export const truncate = (x: number) => Math.floor(x * 100 + 1e-9) / 100;

export function gradePoint(c: Course): number | null {
  if (rules.excludedFromGpa.includes(c.grade)) return null;
  const p = POINTS[c.grade];
  return c.retake ? Math.min(p, RETAKE_CAP) : p;
}

export function stats(courses: Course[], percent?: number): Stats {
  let sum = 0, gpaCredits = 0, earned = 0;
  for (const c of courses) {
    const p = gradePoint(c);
    if (p !== null) { sum += p * c.credits; gpaCredits += c.credits; }
    if (c.grade !== 'F' && c.grade !== 'NP') earned += c.credits;
  }
  return { gpa: gpaCredits ? truncate(sum / gpaCredits) : 0, gpaCredits, earned, percent };
}

export const semesterStats = (s: Semester) => stats(s.courses, s.percent);

/** i번째 학기까지의 누적 */
export const cumulativeStats = (sems: Semester[], upto = sems.length - 1) =>
  stats(sems.slice(0, upto + 1).flatMap(s => s.courses));

/** 프로필 전체 누적 (빠른 입력 모드 포함) */
export function profileCumulative(p: Profile): Stats {
  if (p.quick) return { gpa: truncate(p.quick.gpa), gpaCredits: p.quick.credits, earned: p.quick.credits };
  return cumulativeStats(p.semesters);
}
