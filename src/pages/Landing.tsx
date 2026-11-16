import { go } from '../App';
import { copy, won } from '../lib/copy';
import { Profile } from '../lib/gpa';
import { findMissed } from '../lib/opportunities';

export default function Landing({ profile }: { profile: Profile | null }) {
  const r = profile && findMissed(profile);
  const tone = profile?.tone ?? 'mild';
  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">
          성적표에는 안 나오는 숫자가 있어요.
        </h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-ink text-white p-6">
            <p className="text-sm text-slate-300">{copy.heroMoney(tone)}</p>
            <p className="mt-2 text-4xl font-bold num">{r ? won(r.total) : '???만 원'}</p>
          </div>
          <div className="rounded-xl bg-card border border-line p-6">
            <p className="text-sm text-muted">{copy.heroCount(tone)}</p>
            <p className="mt-2 text-4xl font-bold num">{r ? `${r.count}건` : '??건'}</p>
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={() => go(r ? 'result' : 'input')}
            className="w-full sm:w-auto min-h-12 px-6 rounded-lg bg-navy text-white font-semibold hover:bg-ink transition-colors">
            {r ? '결과 다시 보기' : '내 성적으로 확인하기'}
          </button>
          {r && <button onClick={() => go('input')} className="block text-sm underline text-muted min-h-11">성적 수정하기</button>}
          <p className="text-sm text-muted">익명으로 계산하고, 저장하지 않아요.</p>
        </div>
      </section>

      <section aria-labelledby="trust" className="space-y-3">
        <h2 id="trust" className="sr-only">약속</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ['이름·학번 안 받아요', '과목명도 묻지 않아요. 학점과 성적 등급만 입력해요.'],
            ['브라우저 밖으로 안 나가요', '계산은 모두 이 기기 안에서 해요. 서버로 보내지 않아요.'],
            ['남과 비교하지 않아요', '순위·백분위 비교 없이, 나의 기준선만 보여 줘요.'],
          ].map(([t, d]) => (
            <li key={t} className="rounded-xl border border-line bg-card p-4">
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="text-sm text-muted space-y-1">
        <p>놓친 금액은 <b>성적 기준 미달로 지원 자격이 없었던 기회의 합계</b>예요. 선발을 보장하는 금액이 아니에요.</p>
        <p>숫자를 확인한 다음엔 <b>다음 학기에 되찾는 경로</b>까지 같이 보여 드려요.</p>
      </section>
    </div>
  );
}
