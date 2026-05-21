DROP TABLE IF EXISTS surveys;
DROP TABLE IF EXISTS responses;

-- 1. 问卷模板表
CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    questions TEXT, -- 存储为 JSON 字符串，例如：[{"id":"q1","type":"text","title":"您的姓名？"}]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 问卷提交结果表
CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    survey_id TEXT NOT NULL,
    answers TEXT,   -- 存储为 JSON 字符串，例如：{"q1":"张三"}
    file_url TEXT,  -- 用户上传的附件在 R2 中的公网 URL
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 预埋一条测试问卷数据
INSERT INTO surveys (id, title, description, questions) VALUES (
    'demo-survey',
    '边缘算力调查问卷',
    '体验 Cloudflare D1 + KV + R2 的极致响应速度',
    '[{"id":"q1","type":"text","title":"1. 您最看重 Cloudflare Workers 的哪一点？"},{"id":"q2","type":"file","title":"2. 上传您的架构设计图（可选）"}]'
);

-- 预埋一条测试问卷提交结果数据
INSERT INTO responses (id, survey_id, answers, file_url) VALUES (
    'demo-response',
    'demo-survey',
    '{"q1":"我最看重 Cloudflare Workers 的极致性能和全球分布的边缘网络。"}',
    'https://example.com/path/to/uploaded/file.png'
);
