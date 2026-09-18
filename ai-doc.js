/* =========================================================================
   ai-doc.js  —  피컴 "AI 제안서·서류 작성" 모듈 (추가형)
   -------------------------------------------------------------------------
   ▸ 기존 index.html을 수정/삭제하지 않습니다.
   ▸ index.html 의 </body> 바로 위에 아래 한 줄만 추가하세요:
        <script src="ai-doc.js"></script>
   ▸ 실제 AI로 작동시키려면 아래 AI_ENDPOINT 에 백엔드 주소를 넣으세요.
     (예: Vercel 에 올린 https://내프로젝트.vercel.app/api/generate )
     ※ 브라우저 코드에 OpenAI 키를 직접 넣지 마세요. 키는 백엔드에만 둡니다.
     ※ AI_ENDPOINT 가 비어 있으면 '데모(샘플)' 출력으로 동작합니다.
   ========================================================================= */
(function () {
  var AI_ENDPOINT = ""; // 예: "https://picom-xxxx.vercel.app/api/generate"

  function init() {
    var host =
      document.querySelector('#services .wrap') ||
      document.querySelector('#services') ||
      document.body;

    // ---- 스타일 주입 (기존 테마 변수 재사용) ----
    var style = document.createElement('style');
    style.textContent = `
      .ai-card{margin-top:22px;}
      .ai-badge{display:inline-block;font-size:11px;font-weight:700;color:#241701;background:var(--amber,#E8971E);border-radius:5px;padding:2px 7px;margin-left:8px;vertical-align:middle;}
      .ai-lead{color:var(--muted,#5C6B7A);margin:2px 0 16px;}
      .ai-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
      @media(max-width:720px){.ai-grid{grid-template-columns:1fr;}}
      .ai-label{display:block;font-weight:600;font-size:14px;margin-bottom:7px;}
      .ai-ta{width:100%;min-height:150px;resize:vertical;border:1px solid var(--line,#DCE2E9);border-radius:8px;padding:11px 12px;font-family:inherit;font-size:14px;background:var(--bg,#fff);color:var(--ink,#12202E);line-height:1.6;}
      .ai-ta:focus{outline:2px solid var(--amber,#E8971E);border-color:transparent;}
      .ai-file{display:flex;align-items:center;gap:8px;margin-top:8px;}
      .ai-hint{font-size:12px;color:var(--muted,#5C6B7A);}
      .ai-mini{display:flex;gap:8px;margin-top:8px;}
      .ai-mini input{flex:1;min-width:0;border:1px solid var(--line,#DCE2E9);border-radius:8px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--bg,#fff);color:var(--ink,#12202E);}
      .ai-actions{display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap;}
      .ai-status{font-size:13px;color:var(--muted,#5C6B7A);}
      .ai-out-wrap{margin-top:18px;border-top:1px solid var(--line,#DCE2E9);padding-top:16px;}
      .ai-out-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;font-weight:600;font-size:14px;gap:10px;flex-wrap:wrap;}
      .ai-out-btns{display:flex;gap:8px;}
      .ai-btn-ghost{background:var(--panel,#F5F7FA);color:var(--ink,#12202E);border:1px solid var(--line,#DCE2E9);border-radius:8px;padding:7px 13px;font-size:13px;font-weight:600;cursor:pointer;}
      .ai-out{width:100%;min-height:280px;resize:vertical;border:1px solid var(--line,#DCE2E9);border-radius:8px;padding:14px;font-family:inherit;font-size:14px;line-height:1.7;background:var(--panel,#F5F7FA);color:var(--ink,#12202E);white-space:pre-wrap;}
    `;
    document.head.appendChild(style);

    // ---- 패널 주입 ----
    var panel = document.createElement('div');
    panel.className = 'card ai-card';
    panel.id = 'aiDoc';
    panel.innerHTML = `
      <div class="card-h"><h3>AI 제안서·서류 작성 <span class="ai-badge">AI</span></h3></div>
      <p class="ai-lead">발주처에서 받은 <b>서류 양식</b>과 들어갈 <b>내용</b>만 넣으면, AI가 양식에 맞춰 제안서 초안을 작성합니다.</p>
      <div class="ai-grid">
        <div class="ai-col">
          <label class="ai-label" for="ai-tpl">① 서류 양식 (템플릿·목차)</label>
          <textarea id="ai-tpl" class="ai-ta" placeholder="발주처가 준 서식/목차를 붙여넣으세요.&#10;예)&#10;1. 회사 개요&#10;2. 사업 이해도&#10;3. 수행 계획&#10;4. 투입 인력&#10;5. 기대 효과"></textarea>
          <div class="ai-file">
            <input type="file" id="ai-tpl-file" accept=".txt,.md">
            <span class="ai-hint">.txt 양식 파일 불러오기 (선택)</span>
          </div>
        </div>
        <div class="ai-col">
          <label class="ai-label" for="ai-body">② 서류에 들어갈 내용</label>
          <textarea id="ai-body" class="ai-ta" placeholder="핵심 실적, 강조할 강점, 요구사항, 수행 방안 등을 자유롭게 적으세요."></textarea>
          <div class="ai-mini">
            <input type="text" id="ai-company" placeholder="회사명 (예: OO전기)">
            <input type="text" id="ai-project" placeholder="사업명 (예: OO청사 전기공사)">
          </div>
        </div>
      </div>
      <div class="ai-actions">
        <button class="btn btn-amber" id="ai-gen" style="padding:11px 20px;">AI로 작성</button>
        <span class="ai-status" id="ai-status"></span>
      </div>
      <div class="ai-out-wrap" id="ai-out-wrap" style="display:none;">
        <div class="ai-out-head">
          <span>생성 결과 (편집 가능)</span>
          <div class="ai-out-btns">
            <button class="ai-btn-ghost" id="ai-copy">복사</button>
            <button class="ai-btn-ghost" id="ai-dl">다운로드(.txt)</button>
          </div>
        </div>
        <textarea id="ai-out" class="ai-out"></textarea>
      </div>
    `;
    host.appendChild(panel);

    // ---- 로직 ----
    var $ = function (id) { return panel.querySelector('#' + id); };
    var aiTpl = $('ai-tpl'), aiBody = $('ai-body'), aiOut = $('ai-out'),
        aiOutWrap = $('ai-out-wrap'), aiStatus = $('ai-status'), aiGen = $('ai-gen');

    function setStatus(t) { aiStatus.textContent = t || ''; }
    function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

    $('ai-tpl-file').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { aiTpl.value = r.result; };
      r.readAsText(f, 'UTF-8');
    });

    function demoDraft(tpl, body, company, project) {
      company = company || '(회사명)';
      project = project || '(사업명)';
      var secs = [];
      if (tpl && tpl.trim()) {
        secs = tpl.split(/\n+/).map(function (s) {
          return s.replace(/^\s*(\d+[\.\)]|[가나다라마바사아자차]\.|[IVXivx]+\.|[■○●▶◆•·\-])\s*/, '').trim();
        }).filter(function (s) { return s.length > 0; });
      }
      if (!secs.length) secs = ['회사 개요', '사업 이해도', '수행 계획', '투입 인력 및 조직', '기대 효과'];
      var sentences = (body || '').split(/(?:[.。!?]\s+)|\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
      var bar = new Array(29).join('─');
      var out = company + ' 제안서 — ' + project + '\n작성일: ' + today() + '\n' + bar + '\n\n';
      secs.forEach(function (h, i) {
        out += '■ ' + h + '\n';
        out += '   ' + company + '은(는) ' + project + ' 수행에 있어 ' + h + ' 측면에서 충분한 역량과 준비를 갖추고 있습니다.';
        if (sentences.length) out += ' ' + sentences[i % sentences.length];
        out += '\n\n';
      });
      out += bar + '\n※ 데모(샘플) 출력입니다. 실제 AI 작성은 AI_ENDPOINT(백엔드) 연결 시 활성화됩니다.';
      return out;
    }

    aiGen.addEventListener('click', function () {
      var tpl = aiTpl.value, body = (aiBody.value || '').trim();
      var company = ($('ai-company').value || '').trim(), project = ($('ai-project').value || '').trim();
      if (!body && !tpl.trim()) { setStatus('양식이나 내용 중 하나는 입력해주세요.'); return; }
      aiOutWrap.style.display = 'block';
      if (AI_ENDPOINT) {
        setStatus('AI가 작성 중…'); aiGen.disabled = true;
        fetch(AI_ENDPOINT, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: tpl, content: body, company: company, project: project })
        })
          .then(function (r) { return r.json(); })
          .then(function (d) { aiOut.value = (d && (d.text || d.result || d.output)) || ('(응답 해석 실패) ' + JSON.stringify(d)); setStatus('완료'); })
          .catch(function () { aiOut.value = demoDraft(tpl, body, company, project); setStatus('백엔드 연결 실패 — 데모 출력으로 대체했습니다.'); })
          .then(function () { aiGen.disabled = false; });
      } else {
        setStatus('데모 모드로 작성했습니다. (실제 AI 아님 — 백엔드 연결 필요)');
        aiOut.value = demoDraft(tpl, body, company, project);
      }
      aiOutWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    $('ai-copy').addEventListener('click', function () {
      aiOut.select();
      if (navigator.clipboard) navigator.clipboard.writeText(aiOut.value);
      else { try { document.execCommand('copy'); } catch (e) {} }
      setStatus('복사되었습니다.');
    });

    $('ai-dl').addEventListener('click', function () {
      var blob = new Blob([aiOut.value], { type: 'text/plain;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = '제안서_초안.txt'; a.click(); URL.revokeObjectURL(a.href);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
