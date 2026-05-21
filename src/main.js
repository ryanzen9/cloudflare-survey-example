// 1. 注册 PWA Service Worker 服务
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('PWA Service Worker 注册成功！'))
      .catch(err => console.error('PWA 注册失败: ', err));
  });
}

const SURVEY_ID = 'demo-survey';
const statusDiv = document.getElementById('status');

// 2. 页面初始化：向 Hono 边缘 API 获取问卷数据
async function initSurvey() {
  try {
    const res = await fetch(`/api/survey/${SURVEY_ID}`);
    if (!res.ok) throw new Error("问卷模板获取失败");

    const json = await res.json();
    const survey = json.data;

    document.getElementById('survey-title').innerText = survey.title;
    document.getElementById('survey-desc').innerText = `${survey.description} (数据源: ${json.source})`;

    const container = document.getElementById('questions-container');
    survey.questions.forEach(q => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="q-title">${q.title}</div>
        <input type="${q.type}" id="${q.id}" name="${q.id}" required="${q.type === 'text'}">
      `;
      container.appendChild(card);
    });

    document.getElementById('survey-form').style.display = 'block';
  } catch (err) {
    statusDiv.innerText = `加载失败: ${err.message}. 请检查本地 D1 初始化状态。`;
  }
}

// 3. 处理表单提交（打包为 FormData 以便 R2 支持文件流传输）
document.getElementById('survey-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  statusDiv.innerText = "正在同步上传至全球边缘节点...";

  const answers = {};
  const formDataToSend = new FormData();

  // 提取文本框输入
  const textInput = document.getElementById('q1');
  answers['q1'] = textInput.value;
  formDataToSend.append('answers', JSON.stringify(answers));

  // 提取上传的文件流
  const fileInput = document.getElementById('q2');
  if (fileInput.files.length > 0) {
    formDataToSend.append('file', fileInput.files[0]);
  }

  try {
    const res = await fetch(`/api/survey/${SURVEY_ID}/submit`, {
      method: 'POST',
      body: formDataToSend
    });

    const result = await res.json();
    if (result.success) {
      statusDiv.style.color = 'green';
      statusDiv.innerText = `🎉 ${result.message}\n生成答卷凭证ID: ${result.responseId}`;
      document.getElementById('survey-form').reset();
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    statusDiv.style.color = 'red';
    statusDiv.innerText = `提交失败: ${err.message}`;
  }
});

initSurvey();
