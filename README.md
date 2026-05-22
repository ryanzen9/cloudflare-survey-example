# Cloudflare Survey Example

# Start

Install dependencies:

```bash
npm install

# Configure your Cloudflare credentials in `wrangler.toml`
cp wrangler.local.toml wrangler.toml

# initialize D1 database
npx wrangler d1 create survey-db

npx wrangler kv namespace create SURVEY_CACHE

npx wrangler r2 bucket create survey-attachments

npm run db:init
```

替换 `wrangler.toml` 中的 D1 数据库、KV 命名空间和 R2 存储桶的绑定信息为你创建的资源。

2. Start development server:

```bash
npm run dev
```

3. Build and deploy:

package.json 中的 `deploy` 命令已经配置好了构建和部署的流程，你只需要运行：

```bash
npx wangler login
npm run build
npm run deploy
```
