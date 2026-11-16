// 매운맛: 손실을 직설적으로 말하는 것까지. 인격 비하·타인 비교·미래 단정·욕설 금지.
type Tone = 'spicy' | 'mild';

export const won = (n: number) =>
  n >= 10000 ? `${Math.floor(n / 10000).toLocaleString('ko-KR')}만 원` : `${n.toLocaleString('ko-KR')}원`;

export const copy = {
  heroMoney: (t: Tone) => (t === 'spicy' ? '올해 당신이 날린 장학금' : '올해 성적 기준으로 놓친 장학금'),
  heroCount: (t: Tone) => (t === 'spicy' ? '올해 날아간 지원 기회' : '올해 놓친 지원 기회'),
  missed: (t: Tone, gap: string, amount: number | null) =>
    t === 'spicy'
      ? `${gap}. 그 차이로 ${amount ? won(amount) + '이' : '이 기회가'} 날아갔습니다.`
      : `${gap} 차이로 지원 자격이 없었어요.`,
  drop: (t: Tone) => (t === 'spicy' ? '한 번 더 미끄러지면 이것까지 사라집니다.' : '여기서 더 내려가면 이것도 잃어요.'),
  impossible: (t: Tone) =>
    t === 'spicy'
      ? '그 학점은 남은 학기만으로는 불가능합니다. 재수강 페이지부터 보세요.'
      : '현재 구조로는 어려운 목표예요. 재수강으로 경로를 다시 짜 봐요.',
  recover: (t: Tone, gpa: number) =>
    t === 'spicy' ? `다음 학기 ${gpa.toFixed(2)}. 이번엔 놓치지 마세요.` : `다음 학기 평균 ${gpa.toFixed(2)}면 다시 지원할 수 있어요.`,
};

export function gapText(g: { kind: 'gpa' | 'credits' | 'percent'; short: number }) {
  if (g.kind === 'gpa') return `${g.short.toFixed(2)}점`;
  if (g.kind === 'credits') return `${g.short}학점`;
  return `백분위 ${g.short}점`;
}
