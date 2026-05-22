import { Hono } from 'hono';
import { logger } from 'hono/logger';

const app = new Hono();

app.use(logger());

app.get('/api', (c) => c.text('Hello Hono!'));

/**
 * 接口 1: 获取问卷模板 (KV 缓存优先策略)
 * GET /api/survey/:id
 */
app.get('/api/survey/:id', async (c) => {
  const surveyId = c.req.param('id');
  const cacheKey = `survey:template:${surveyId}`;

  const cached = await c.env.SURVEY_CACHE.get(cacheKey);
  if (cached) {
    return c.json({ source: 'edge-kv', data: JSON.parse(cached) });
  }

  try {
    const survey = await c.env.DB.prepare(
      'SELECT * FROM surveys WHERE id = ?'
    ).bind(surveyId).first();

    if (!survey) {
      return c.json({ error: '问卷不存在' }, 404);
    }

    survey.questions = JSON.parse(survey.questions);

    await c.env.SURVEY_CACHE.put(cacheKey, JSON.stringify(survey), { expirationTtl: 300 });

    return c.json({ source: 'edge-d1', data: survey });
  } catch (err) {
    return c.json({ error: '服务器内部数据库错误', details: err.message }, 500);
  }
});

/**
 * 接口 2: 提交答卷结果
 * POST /api/survey/:id/submit
 */
app.post('/api/survey/:id/submit', async (c) => {
  const surveyId = c.req.param('id');
  const formData = await c.req.parseBody();

  const answersJson = formData['answers'];
  const fileAttachment = formData['file'];

  let fileUrl = null;
  const responseId = `resp-${crypto.randomUUID()}`;

  try {
    if (fileAttachment && fileAttachment instanceof File && fileAttachment.size > 0) {
      const fileKey = `uploads/${surveyId}/${responseId}-${fileAttachment.name}`;
      await c.env.SURVEY_R2.put(fileKey, fileAttachment.stream(), {
        httpMetadata: { contentType: fileAttachment.type }
      });
      fileUrl = `/api/file/${fileKey}`;
    }

    await c.env.DB.prepare(
      'INSERT INTO responses (id, survey_id, answers, file_url) VALUES (?, ?, ?, ?)'
    ).bind(responseId, surveyId, answersJson, fileUrl).run();

    return c.json({
      success: true,
      message: '答卷提交成功！边缘算力已完成持久化存储。',
      responseId
    });
  } catch (err) {
    return c.json({ error: '答卷提交失败', details: err.message }, 500);
  }
});


/**
 * 接口 3: 获取单条答卷详情
 * GET /api/responses/:id
 */
app.get('/api/responses/:id', async (c) => {
  const responseId = c.req.param('id');
  try {
    const response = await c.env.DB.prepare(
      'SELECT * FROM responses WHERE id = ?'
    ).bind(responseId).first();

    if (!response) {
      return c.json({ error: '答卷不存在' }, 404);
    }

    response.answers = JSON.parse(response.answers);

    const survey = await c.env.DB.prepare(
      'SELECT * FROM surveys WHERE id = ?'
    ).bind(response.survey_id).first();

    if (survey) {
      survey.questions = JSON.parse(survey.questions);
    }

    return c.json({ source: 'edge-d1', data: response, survey: survey || null });
  } catch (err) {
    return c.json({ error: '服务器内部数据库错误', details: err.message }, 500);
  }
});

/**
 * 接口 4: 获取所有答卷列表
 * GET /api/responses
 */
app.get('/api/responses', async (c) => {

  try {
    const responses = await c.env.DB.prepare(
      'SELECT * FROM responses'
    ).all();

    const {results} = responses;

    console.log('Fetched responses from D1:', typeof results ,results);

    if (!results || results.length === 0) {
      return c.json({ data: [] }, 200);
    }

    return c.json({ source: 'edge-d1', data: results });
  } catch (err) {
    return c.json({ error: '服务器内部数据库错误', details: err.message }, 500);
  }
});


/**
 * 接口 5: 从 R2 获取上传文件
 * GET /api/file/:path{.+}
 */
app.get('/api/file/*', async (c) => {
  const fileKey = c.req.path.replace(/^\/api\/file\//, '');
  try {
    const object = await c.env.SURVEY_R2.get(decodeURIComponent(fileKey));
    if (!object) {
      return c.json({ error: '文件不存在' }, 404);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    return new Response(object.body, { headers });
  } catch (err) {
    return c.json({ error: '文件获取失败', details: err.message }, 500);
  }
});

// 非 API 路由回退到静态资产（SPA 前端）
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
