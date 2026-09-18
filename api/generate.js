/* =========================================================================
   api/generate.js  —  피컴 AI 제안서 작성 백엔드 (Vercel · Google Gemini · 무료)
   -------------------------------------------------------------------------
   ▸ 발표(캠프)용: Gemini 무료 등급을 사용해 비용 0원으로 작동합니다.
   ▸ 프론트엔드(ai-doc.js)는 그대로 두면 됩니다. 규격 동일: {template,content,...} → {text}
   ▸ 항목이 여러 개면 항목별로 나눠 생성해 이어 붙입니다(긴 문서 지원).

   ── 준비 (모두 무료) ──────────────────────────────────────────────
   1) https://aistudio.google.com 접속 → 로그인 → "Get API key" → 키 생성(무료).
   2) 이 파일을 리포지토리의  api/generate.js  경로에 둔다.
   3) https://vercel.com 에 GitHub 리포지토리를 연결해 배포한다.
   4) Vercel > Settings > Environment Variables 에
        GEMINI_API_KEY = (1번에서 만든 키)   등록.
   5) (선택) 긴 문서용으로 vercel.json 에:
        { "functions": { "api/generate.js": { "maxDuration": 60 } } }
   6) 배포 주소  https://내프로젝트.vercel.app/api/generate  를
      ai-doc.js 의 AI_ENDPOINT 에 넣는다.

   ── 참고 ─────────────────────────────────────────────────────────
   · 무료 등급은 분당 요청 수 제한이 있습니다(대략 분당 10회 안팎).
     발표 중 버튼을 연타하지 말고 한 번씩 눌러주세요.
   · 무료 등급은 입력 데이터가 구글 서비스 개선에 사용될 수 있습니다.
     발표용 샘플 내용으로 시연하시길 권합니다(민감정보 X).
   · 모델이 404(없음)로 뜨면 아래 MODEL 값을 최신 무료 모델로 바꾸세요.
     (예: 'gemini-2.5-flash' → 'gemini-3.8-flash')
   ========================================================================= */

const MODEL = 'gemini-3.6-flash'; // 무료. 만약 404가 나면 'gemini-3.8-flash' 로 교체하세요.
const MAX_SECTIONS = 8;           // 무료 등급 분당 제한 보호 (항목 상한). 초과분은 잘림.

async function callGemini(system, user, maxTokens) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens || 2200 },
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || 'Gemini 호출 실패');
  var out = '';
  try {
    var parts = data.candidates[0].content.parts || [];
    out = parts.map(function (p) { return p.text || ''; }).join('');
  } catch (e) { out = ''; }
  return out;
}

function parseHeadings(template) {
  if (!template || !template.trim()) return [];
  return template.split(/\r?\n/).map(function (s) {
    return s.replace(/^\s*(\d+[\.\)]|[가나다라마바사아자차]\.|[IVXivx]+\.|[■○●▶◆•·\-])\s*/, '').trim();
  }).filter(function (s) { return s.length > 0 && s.length <= 60; });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 운영 시 본인 도메인으로 제한 권장
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 없습니다.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const template = body.template || '';
    const content = body.content || '';
    const company = body.company || '';
    const project = body.project || '';

    const system =
      '너는 대한민국 건설·공공조달 제안서 작성 전문가다. 한국어 존댓말(격식체)로, ' +
      '제공된 회사 정보와 내용에 근거해서만 작성하고 없는 실적·수치는 지어내지 않는다. ' +
      '실무에서 바로 다듬어 쓸 수 있는 구체적이고 충실한 문장을 쓴다.';

    const ctx =
      '■ 회사명: ' + (company || '(미기재)') + '\n' +
      '■ 사업명: ' + (project || '(미기재)') + '\n\n' +
      '■ 회사가 제공한 내용:\n' + (content || '(내용 없음)');

    const headings = parseHeadings(template).slice(0, MAX_SECTIONS);

    if (headings.length) {
      const parts = await Promise.all(headings.map(async function (h) {
        const user =
          '아래 정보를 바탕으로, 제안서의 "' + h + '" 항목에 들어갈 본문을 상세히(여러 문단으로 충분히 길게) 작성해줘. ' +
          '소제목은 다시 쓰지 말고 본문만. 구체적 근거와 수행 방안 위주로.\n\n' + ctx;
        try {
          const text = await callGemini(system, user, 2200);
          return '■ ' + h + '\n' + (text.trim() || '(이 항목 생성 실패 — 다시 시도해주세요)');
        } catch (e) {
          return '■ ' + h + '\n(생성 실패: ' + (e.message || e) + ')';
        }
      }));
      const header = (company || '제안서') + ' 제안서 — ' + (project || '') + '\n\n';
      return res.status(200).json({ text: header + parts.join('\n\n'), sectionCount: headings.length });
    } else {
      const user =
        '아래 정보를 바탕으로 완결된 제안서를 작성해줘. 각 항목은 "■ 항목명" 형식의 소제목으로 시작하고, ' +
        '표준 목차(회사 개요 / 사업 이해도 / 수행 계획 / 추진 일정 / 투입 인력 및 조직 / 품질·안전 관리 / 기대 효과)를 ' +
        '각 항목마다 여러 문단으로 충실히 채워줘.\n\n' + ctx;
      const text = await callGemini(system, user, 4000);
      return res.status(200).json({ text: text, sectionCount: null });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
