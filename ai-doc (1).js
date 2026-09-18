/* =========================================================================
   ai-doc.js  —  피컴 "AI 제안서·서류 작성" 모듈 (추가형, v2)
   -------------------------------------------------------------------------
   ▸ 기존 index.html을 수정/삭제하지 않습니다.
   ▸ index.html 의 </body> 바로 위에 한 줄만 추가:
        <script src="ai-doc.js"></script>
   ▸ v2 새 기능:
       · 양식 파일로 Word(.docx) / 텍스트(.txt) 업로드 읽기
         (한글 .hwp 는 '다른 이름으로 저장 → Word(.docx)' 후 올려주세요)
       · 결과를 Word 문서(.docx) 로 다운로드 (항목별 소제목 + 페이지 구분)
       · 30장 넘는 긴 문서: 백엔드가 항목별로 나눠 생성 (아래 AI_ENDPOINT 연결 시)
   ▸ 실제 AI: 아래 AI_ENDPOINT 에 백엔드 주소를 넣으세요. 비어 있으면 데모(샘플).
     (브라우저 코드에 OpenAI 키를 직접 넣지 마세요. 키는 백엔드에만.)
   ========================================================================= */
(function () {
  var AI_ENDPOINT = ""; // 예: "https://picom-xxxx.vercel.app/api/generate"

  var MAMMOTH_URL = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js"; // .docx 읽기
  var DOCX_URL = "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js";           // .docx 쓰기

  var _loaded = {};
  function loadScript(url) {
    if (_loaded[url]) return _loaded[url];
    _loaded[url] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url; s.onload = resolve; s.onerror = function () { reject(new Error('스크립트 로드 실패: ' + url)); };
      document.head.appendChild(s);
    });
    return _loaded[url];
  }

  function init() {
    var host = document.querySelector('#services .wrap') || document.querySelector('#services') || document.body;

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
      .ai-file{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;}
      .ai-hint{font-size:12px;color:var(--muted,#5C6B7A);}
      .ai-mini{display:flex;gap:8px;margin-top:8px;}
      .ai-mini input{flex:1;min-width:0;border:1px solid var(--line,#DCE2E9);border-radius:8px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--bg,#fff);color:var(--ink,#12202E);}
      .ai-actions{display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap;}
      .ai-status{font-size:13px;color:var(--muted,#5C6B7A);}
      .ai-out-wrap{margin-top:18px;border-top:1px solid var(--line,#DCE2E9);padding-top:16px;}
      .ai-out-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;font-weight:600;font-size:14px;gap:10px;flex-wrap:wrap;}
      .ai-out-btns{display:flex;gap:8px;flex-wrap:wrap;}
      .ai-btn-ghost{background:var(--panel,#F5F7FA);color:var(--ink,#12202E);border:1px solid var(--line,#DCE2E9);border-radius:8px;padding:7px 13px;font-size:13px;font-weight:600;cursor:pointer;}
      .ai-out{width:100%;min-height:280px;resize:vertical;border:1px solid var(--line,#DCE2E9);border-radius:8px;padding:14px;font-family:inherit;font-size:14px;line-height:1.7;background:var(--panel,#F5F7FA);color:var(--ink,#12202E);white-space:pre-wrap;}
    `;
    document.head.appendChild(style);

    var panel = document.createElement('div');
    panel.className = 'card ai-card';
    panel.id = 'aiDoc';
    panel.innerHTML = `
      <div class="card-h"><h3>AI 제안서·서류 작성 <span class="ai-badge">AI</span></h3></div>
      <p class="ai-lead">발주처에서 받은 <b>서류 양식</b>(Word/텍스트)과 들어갈 <b>내용</b>만 넣으면, AI가 양식에 맞춰 제안서를 작성해 <b>Word 문서(.docx)</b>로 만들어 줍니다.</p>
      <div class="ai-grid">
        <div class="ai-col">
          <label class="ai-label" for="ai-tpl">① 서류 양식 (템플릿·목차)</label>
          <textarea id="ai-tpl" class="ai-ta" placeholder="발주처가 준 서식/목차를 붙여넣거나, 아래에서 Word 파일을 올리세요.&#10;예)&#10;1. 회사 개요&#10;2. 사업 이해도&#10;3. 수행 계획&#10;4. 투입 인력&#10;5. 기대 효과"></textarea>
          <div class="ai-file">
            <input type="file" id="ai-tpl-file" accept=".txt,.md,.docx,.hwp">
            <span class="ai-hint">Word(.docx)·텍스트(.txt) 업로드 가능 · 한글(.hwp)은 Word로 저장 후</span>
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
            <button class="ai-btn-ghost" id="ai-dl-docx">Word 다운로드(.docx)</button>
            <button class="ai-btn-ghost" id="ai-dl-txt">텍스트(.txt)</button>
          </div>
        </div>
        <textarea id="ai-out" class="ai-out"></textarea>
      </div>
    `;
    host.appendChild(panel);

    var $ = function (id) { return panel.querySelector('#' + id); };
    var aiTpl = $('ai-tpl'), aiBody = $('ai-body'), aiOut = $('ai-out'),
        aiOutWrap = $('ai-out-wrap'), aiStatus = $('ai-status'), aiGen = $('ai-gen');

    function setStatus(t) { aiStatus.textContent = t || ''; }
    function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

    /* ---- 파일 읽기: .txt / .docx (.hwp 안내) ---- */
    function readFileToText(file) {
      var name = (file.name || '').toLowerCase();
      if (name.endsWith('.txt') || name.endsWith('.md')) {
        return new Promise(function (resolve, reject) {
          var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = reject; r.readAsText(file, 'UTF-8');
        });
      }
      if (name.endsWith('.docx')) {
        return loadScript(MAMMOTH_URL).then(function () {
          return new Promise(function (resolve, reject) {
            var r = new FileReader();
            r.onload = function () {
              window.mammoth.extractRawText({ arrayBuffer: r.result })
                .then(function (res) { resolve(res.value || ''); }).catch(reject);
            };
            r.onerror = reject; r.readAsArrayBuffer(file);
          });
        });
      }
      if (name.endsWith('.hwp')) {
        return Promise.reject({ hwp: true });
      }
      return Promise.reject({ unsupported: true });
    }

    $('ai-tpl-file').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      setStatus('양식 파일을 읽는 중…');
      readFileToText(f).then(function (text) {
        aiTpl.value = text; setStatus('양식을 불러왔습니다.');
      }).catch(function (err) {
        if (err && err.hwp) setStatus('한글(.hwp)은 바로 못 읽습니다. 한글에서 [다른 이름으로 저장 → Word 문서(.docx)] 후 올려주세요.');
        else setStatus('파일을 읽지 못했습니다. .docx 또는 .txt 파일인지 확인해주세요.');
      });
    });

    /* ---- 데모(샘플) 생성 ---- */
    function demoDraft(tpl, body, company, project) {
      company = company || '(회사명)'; project = project || '(사업명)';
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
      out += bar + '\n※ 데모(샘플) 출력입니다. 실제 AI 작성·긴 문서는 AI_ENDPOINT(백엔드) 연결 시 활성화됩니다.';
      return out;
    }

    aiGen.addEventListener('click', function () {
      var tpl = aiTpl.value, body = (aiBody.value || '').trim();
      var company = ($('ai-company').value || '').trim(), project = ($('ai-project').value || '').trim();
      if (!body && !tpl.trim()) { setStatus('양식이나 내용 중 하나는 입력해주세요.'); return; }
      aiOutWrap.style.display = 'block';
      if (AI_ENDPOINT) {
        setStatus('AI가 작성 중… (항목이 많으면 시간이 걸립니다)'); aiGen.disabled = true;
        fetch(AI_ENDPOINT, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: tpl, content: body, company: company, project: project })
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && d.error) { aiOut.value = '[오류] ' + d.error; setStatus('백엔드 오류'); return; }
            aiOut.value = (d && (d.text || d.result || d.output)) || '(응답 해석 실패)';
            setStatus('완료 — Word로 다운로드할 수 있습니다.');
          })
          .catch(function () { aiOut.value = demoDraft(tpl, body, company, project); setStatus('백엔드 연결 실패 — 데모 출력으로 대체.'); })
          .then(function () { aiGen.disabled = false; });
      } else {
        setStatus('데모 모드로 작성했습니다. (실제 AI 아님 — 백엔드 연결 필요)');
        aiOut.value = demoDraft(tpl, body, company, project);
      }
      aiOutWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    /* ---- 복사 ---- */
    $('ai-copy').addEventListener('click', function () {
      aiOut.select();
      if (navigator.clipboard) navigator.clipboard.writeText(aiOut.value);
      else { try { document.execCommand('copy'); } catch (e) {} }
      setStatus('복사되었습니다.');
    });

    /* ---- 텍스트 다운로드 ---- */
    $('ai-dl-txt').addEventListener('click', function () {
      downloadBlob(new Blob([aiOut.value], { type: 'text/plain;charset=utf-8' }), '제안서_초안.txt');
    });

    /* ---- Word(.docx) 다운로드 ---- */
    $('ai-dl-docx').addEventListener('click', function () {
      if (!aiOut.value.trim()) { setStatus('먼저 문서를 생성하세요.'); return; }
      setStatus('Word 문서로 변환 중…');
      loadScript(DOCX_URL).then(function () {
        return textToDocxBlob(aiOut.value);
      }).then(function (blob) {
        downloadBlob(blob, '제안서.docx'); setStatus('Word 문서를 내려받았습니다.');
      }).catch(function () {
        setStatus('Word 변환 실패 — 텍스트(.txt)로 대신 받아주세요.');
      });
    });

    function textToDocxBlob(text) {
      var d = window.docx;
      var lines = text.split(/\r?\n/);
      var children = []; var firstHeading = true;
      lines.forEach(function (raw) {
        var t = raw.replace(/\s+$/, '');
        var hm = /^(?:■\s*|#{1,3}\s*|\d+[\.\)]\s*)(.+)$/.exec(t);
        if (hm && hm[1].trim().length <= 40) {
          children.push(new d.Paragraph({
            text: hm[1].trim(), heading: d.HeadingLevel.HEADING_1,
            pageBreakBefore: !firstHeading, spacing: { before: 120, after: 120 }
          }));
          firstHeading = false;
        } else if (t.trim() === '') {
          children.push(new d.Paragraph({ text: '' }));
        } else {
          children.push(new d.Paragraph({ children: [new d.TextRun({ text: t })], spacing: { after: 100 }, }));
        }
      });
      var doc = new d.Document({ sections: [{ children: children }] });
      return d.Packer.toBlob(doc);
    }

    function downloadBlob(blob, name) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
