# 计算机辅助设计AI教学助手 — 安全版部署指南

> 元器 Token 和飞书密钥全部存储在 Cloudflare Worker 中，学生无法通过浏览器查看。

## 架构说明

```
学生浏览器 (GitHub Pages)
    │
    ├── POST /chat ──→ Cloudflare Worker ──→ 腾讯元器 API (Token 在 Worker 中)
    ├── POST /record ─→ Cloudflare Worker ──→ 飞书多维表格 (写入记录)
    └── GET /records ─→ Cloudflare Worker ──→ 飞书多维表格 (读取记录)
```

**学生看到的只有 Worker 地址，看不到任何密钥。**

## 部署步骤

### 第一步：腾讯元器

1. 登录 https://yuanqi.tencent.com
2. 进入你的智能体 → 「应用发布」→「API管理」
3. 记下：
   - **appid**（智能体 ID）
   - **appkey**（API Token）

### 第二步：飞书多维表格

1. 打开 https://feishu.cn 创建一个多维表格
2. 添加 6 个字段：

| 字段名 | 类型 |
|--------|------|
| 学生姓名 | 文本 |
| 学号 | 文本 |
| 问题 | 文本 |
| 回答 | 文本 |
| 类型 | 单选（operation / sizheng）|
| 时间 | 日期 |

3. 从多维表格 URL 中获取两个 ID：
   - URL 格式：`https://xxx.feishu.cn/base/APP_TOKEN/table/TABLE_ID`
   - 记下 **APP_TOKEN** 和 **TABLE_ID**

4. 创建飞书应用：
   - 打开 https://open.feishu.cn → 创建企业自建应用
   - 获取 **App ID** 和 **App Secret**
   - 在「权限管理」中开通：多维表格读写权限
   - 在多维表格中给该应用添加编辑权限

### 第三步：Cloudflare Worker

1. 打开 https://dash.cloudflare.com → 注册/登录（免费）
2. 左侧菜单 → **Workers & Pages** → **Create Worker**
3. 随便起个名字，点击 **Deploy**
4. 点击 **Edit code**，把 `worker/feishu-proxy.js` 的全部内容粘贴进去
5. 点击右上角 **Deploy**
6. 回到 Worker 详情页 → **Settings** → **Variables** → 添加以下 6 个环境变量：

| 变量名 | 值 |
|--------|----|
| `YUANQI_ASSISTANT_ID` | 元器 appid |
| `YUANQI_TOKEN` | 元器 appkey |
| `FEISHU_APP_ID` | 飞书 App ID |
| `FEISHU_APP_SECRET` | 飞书 App Secret |
| `FEISHU_APP_TOKEN` | 多维表格 APP_TOKEN |
| `FEISHU_TABLE_ID` | 多维表格 TABLE_ID |

7. 保存后，记下 Worker 地址，格式如：
   `https://your-worker-name.your-subdomain.workers.dev`

### 第四步：GitHub Pages

1. 打开 GitHub，创建一个新仓库（如 `SW_AI_2026`）
2. 上传以下文件：
   - `index.html`
   - `css/` 文件夹（含 `style.css`）
   - `js/` 文件夹（含 `app.js`）

   **注意**：GitHub 网页上传不支持文件夹，请使用 Git 命令上传：

   ```bash
   cd yuanqi-chat
   git init
   git config user.name "你的用户名"
   git config user.email "你的邮箱"
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```

3. 仓库 **Settings → Pages**
4. Source: **Deploy from a branch**
5. Branch: `main`，Folder: `/ (root)`
6. 点击 **Save**，等待 1-2 分钟
7. 访问地址：`https://你的用户名.github.io/仓库名/`

### 第五步：网页配置

打开网页后：

1. 学生登录后，点击右上角 **⚙️ 设置**
2. 填写 **Worker 代理地址**（第三步获取的 Worker URL）
3. 设置页面标题、欢迎语、教师密码、班级口令等
4. 点击 **保存设置**

> 注意：无需填写元器 Token 或智能体 ID，这些已安全存储在 Worker 中。

## 文件结构

```
yuanqi-chat/
├── index.html           # 主页面（登录 + 对话 + 教师后台）
├── css/
│   └── style.css        # 学术蓝主题样式
├── js/
│   └── app.js           # 全部逻辑（对话走 Worker 代理）
├── worker/
│   └── feishu-proxy.js  # Cloudflare Worker 脚本
└── README.md            # 本文档
```

## 功能清单

- [x] 学生登录（姓名 + 学号 + 班级口令）
- [x] 流式 AI 对话（SSE 实时输出）
- [x] 课堂思政案例自动附带
- [x] Markdown 渲染 + 代码高亮
- [x] 学生提问记录存储（飞书多维表格）
- [x] 教师后台（统计 + 搜索 + 筛选 + CSV 导出）
- [x] 深色/浅色主题切换
- [x] 手机适配
- [x] **Token 安全**（密钥仅在 Worker 中，前端不可见）
