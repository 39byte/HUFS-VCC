// (개발용) 장학 공지 원문 → opportunities.json 항목 초안. 런타임과 무관, 사용자 성적 데이터는 다루지 않음.
// 결과는 반드시 사람이 원문과 대조 검수한 뒤 src/data/opportunities.json에 붙여 넣는다.
//
// 사용: CLOVASTUDIO_API_KEY=... node scripts/structure-notices.ts notice.txt "https://원문URL"
import { readFileSync } from 'node:fs';

const [file, url] = process.argv.slice(2);
const key = process.env.CLOVASTUDIO_API_KEY;
if (!file || !url || !key) {
  console.error('usage: CLOVASTUDIO_API_KEY=... node scripts/structure-notices.ts <notice.txt> <url>');
  process.exit(1);
}

const SCHEMA = `{ id, name, category: "scholarship"|"extracurricular"|"national", group?, amount?(원/학기), tuitionPercent?, amountNote?,
  criteria: { basis: "prevSemester"|"cumulative", minGpa?(4.5만점), minPercent?, minCredits? }, otherRequirements?: string[], period? }`;

const res = await fetch('https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-005', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: `대학 장학 공지에서 성적 기준이 있는 항목만 JSON 배열로 추출하라. 스키마: ${SCHEMA}. 공지에 없는 값은 넣지 말고 생략하라. 성적 외 요건은 otherRequirements에 문장으로. JSON만 출력.` },
      { role: 'user', content: readFileSync(file, 'utf8') },
    ],
    temperature: 0,
    maxTokens: 4096,
  }),
});
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
const text: string = (await res.json()).result.message.content;
const items = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
const today = new Date().toISOString().slice(0, 10);
console.log(JSON.stringify(items.map((o: object) => ({ ...o, url, source: 'TODO: 출처명', verifiedAt: today })), null, 2));
