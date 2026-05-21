// 答卷回答记录页面逻辑

const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error-msg');
const tableEl = document.getElementById('responses-table');
const tbodyEl = document.getElementById('responses-body');
const emptyEl = document.getElementById('empty-state');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', { hour12: false });
}

function shortId(id) {
  return id ? id.substring(0, 16) + '…' : '—';
}

// Load all responses
async function loadResponses() {
  try {
    const res = await fetch('/api/responses');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const responses = json.data || [];

    loadingEl.style.display = 'none';

    if (responses.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    tableEl.style.display = 'table';
    tbodyEl.innerHTML = '';

    responses.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="mono" title="${row.id}">${shortId(row.id)}</span></td>
        <td><span class="badge">${row.survey_id}</span></td>
        <td>${row.file_url ? '<span style="color:#f6821f">📎 有附件</span>' : '<span style="color:#bbb">无</span>'}</td>
        <td>${formatDate(row.submitted_at)}</td>
        <td><button class="btn btn-sm" data-id="${row.id}">查看详情</button></td>
      `;
      tbodyEl.appendChild(tr);
    });

    tbodyEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => openDetail(btn.dataset.id));
    });
  } catch (err) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = `加载失败: ${err.message}`;
  }
}

// Open detail modal
async function openDetail(responseId) {
  modalBody.innerHTML = '<div id="modal-loading" style="text-align:center;padding:32px;color:#999;">加载中...</div>';
  modalOverlay.classList.add('open');

  try {
    const res = await fetch(`/api/responses/${responseId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = json.data;
    const survey = json.survey;

    // Build question map for answer display
    const questionMap = {};
    if (survey && survey.questions) {
      survey.questions.forEach(q => { questionMap[q.id] = q.title; });
    }

    const answers = typeof data.answers === 'string'
      ? JSON.parse(data.answers)
      : (data.answers || {});

    // Build answers HTML
    let answersHtml = '';
    const answerKeys = Object.keys(answers);
    if (answerKeys.length > 0) {
      answersHtml = answerKeys.map(key => {
        const questionTitle = questionMap[key] || key;
        const answerVal = answers[key] || '<em style="color:#bbb">未作答</em>';
        return `
          <div class="qa-card">
            <div class="question">${questionTitle}</div>
            <div class="answer">${answerVal}</div>
          </div>`;
      }).join('');
    } else {
      answersHtml = '<div style="color:#bbb;font-size:13px;">无答题内容</div>';
    }

    const fileHtml = data.file_url
      ? `<div class="section-title">附件</div>
         <a href="${data.file_url}" target="_blank" class="file-link">📎 查看/下载附件</a>`
      : '';

    modalBody.innerHTML = `
      <div class="meta-grid">
        <div class="meta-item">
          <label>答卷 ID</label>
          <span class="mono">${data.id}</span>
        </div>
        <div class="meta-item">
          <label>问卷</label>
          <span><span class="badge">${data.survey_id}</span></span>
        </div>
        <div class="meta-item">
          <label>提交时间</label>
          <span>${formatDate(data.submitted_at)}</span>
        </div>
        <div class="meta-item">
          <label>问卷标题</label>
          <span>${survey ? survey.title : '—'}</span>
        </div>
      </div>
      <div class="section-title">回答内容</div>
      ${answersHtml}
      ${fileHtml}
    `;
  } catch (err) {
    modalBody.innerHTML = `<div style="color:#e53e3e;text-align:center;padding:32px;">加载详情失败: ${err.message}</div>`;
  }
}

// Close modal
modalClose.addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('open');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modalOverlay.classList.remove('open');
});

loadResponses();
