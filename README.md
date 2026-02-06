# Love You - 我们的故事 (Our Story)

❤️ **Love You** 是一个基于 Next.js 开发的沉浸式 3D 电子相册。它旨在通过各种酷炫的 3D 视觉效果（如银河、圣诞树、爱心等），以一种全新的、充满浪漫气息的方式来展示和分享珍贵的照片与记忆。

## ✨ 主要功能

- **🌌 沉浸式 3D 视觉体验**：提供银河 (Galaxy)、圣诞树 (Christmas Tree) 和爱心 (Heart) 等多种 3D 特效模式。
- **📸 个人高清相册**：支持多相册管理，高清图片展示，让每一份回忆都闪闪发光。
- **🌍 多语言支持**：原生支持中文和英文，采用 `next-intl` 实现无缝切换。
- **📱 响应式设计**：完美适配手机、平板及电脑各种尺寸屏幕，提供极致的移动端交互体验。
- **🔒 安全分享**：支持生成专属分享链接，并可自定义展示文字。
- **🖐️ 手势交互**：集成 MediaPipe 技术，支持手势控制（如沉浸模式下的交互）。
- **🌗 暗色模式**：根据系统偏好或手动切换，提供舒适的视觉体验。

## 🛠️ 技术栈

- **框架**: [Next.js 16](https://nextjs.org/) (App Router)
- **前端库**: [React 19](https://react.dev/), [Framer Motion](https://www.framer.com/motion/)
- **3D 引擎**: [Three.js](https://threejs.org/), [React Three Fiber](https://docs.pmnd.rs/react-three-fiber), [Drei](https://github.com/pmndrs/drei)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **数据库**: [Cloudflare D1](https://developers.cloudflare.com/d1/), [Drizzle ORM](https://orm.drizzle.team/)
- **存储**: [Cloudflare R2](https://developers.cloudflare.com/r2/) (兼容 S3 API)
- **国际化**: [Next-intl](https://next-intl-docs.vercel.app/)
- **身份验证**: [Next-Auth (Auth.js)](https://authjs.dev/)
- **部署**: [OpenNext](https://opennext.js.org/) & [Cloudflare Pages](https://pages.cloudflare.com/)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/love-you.git
cd love-you
```

### 2. 安装依赖

推荐使用 `pnpm`:

```bash
pnpm install
```

### 3. 配置环境变量

在根目录创建 `.env` 文件，并根据你的环境填写配置：

```env
# 身份验证密匙
AUTH_SECRET=your_auth_secret

# Cloudflare R2 配置
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=love-you-photos
PHOTOS_BUCKET_URL=your_bucket_public_url
```

### 4. 数据库初始化

```bash
# 生成迁移文件
pnpm run db:generate

# 应用迁移到本地开发数据库
pnpm run db:migrate
```

### 5. 启动开发服务器

```bash
pnpm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可查看。

## 📦 部署

本项目专为 Cloudflare 设计，可以通过以下命令进行部署：

```bash
pnpm run deploy
```

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 许可协议。
