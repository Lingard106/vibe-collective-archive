# Browsing quality repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复图片交接、CSS 覆盖和胶卷浏览三个问题，保留现有视觉与原图。

**Architecture:** 在原有 React/Vite 项目内添加可测试的图片准备与胶卷计算逻辑。图片使用双层交接；胶卷使用固定像素速度和有限可见窗口。样式整理独立验收，不与全站改版混在一起。

**Tech Stack:** React 19、TypeScript、Vite 6、现有 framer-motion/lucide-react；优先使用 Node 24 内置测试，不增加运行时依赖。

**Spec:** `docs/superpowers/specs/2026-10-24-browsing-quality-repairs-scope.md`

## Global Constraints

- 不删除、重新编码或降低任何现有图片质量。
- 不更换个人背景；不改变成员名单、数据库、生日验证和本地管理后台。
- 不重做嘉宾名片；不 push。用户随后明确要求彩蛋检查后直接上线，因此允许本轮直接部署 Cloudflare Pages。
- 本轮不是全站重新设计；暂停、重试、放大等新控件沿用当前暗色与暖金样式。

## Review Focus

## Accepted scope extension: globally unique milk-tea gift

用户确认：访客填写昵称后领取；完成检查后直接上线。添加与现有暗色、暖金、方块人物美术一致的礼箱插画及轻量坠落效果。D1 固定活动主键保证只产生一位领取者；同身份重复提交返回同一凭证；其他访客只看到已领取。管理员凭现有本机鉴权只读核对昵称与兑换码。测试必须使用独立内存库，不能占用生产奖品。

Implementation status and limits are recorded in `docs/qa/2026-10-24-release-check.md`.

- 连续点击 A→B→C，B 最后完成时不能覆盖 C；取消选择时旧请求不能改变页面。
- 图片请求失败、解码失败、请求超时后可重试；不能长期黑屏或缓存永久失败。
- 390×844、768×1024、1024×768、1366×768、1920×1080 的最终布局与整理前一致；改变访问页面顺序不能改变样式。
- 胶卷 0/1/5/100 张照片时不崩溃，方向不变，速度不随数量变化，屏外节点数量受窗口限制。
- 鼠标、触摸、键盘均可停止/查看照片；减少动态效果不自动滚动；关闭大图恢复焦点与原位置。

## Task 1: 稳定的图片准备与双层交接

**Files:** Create `src/media/image-loader.ts`, `src/media/CrossfadeImage.tsx`, `src/media/image-transition.css`, `tests/image-loader.test.ts`; modify `src/App.tsx`, `src/MembersPage.tsx`.

**Interfaces:**
- `prepareImage(src: string): Promise<HTMLImageElement>`：缓存成功加载且解码完成的图片，清除失败缓存；15 秒超时后拒绝并允许重试。
- `CrossfadeImage({src, className, alt, priority, onReady, onError})`：保留上一层，新层准备后用透明度完成 500ms 交接，减少动态效果时直接切换；最多保留两层。
- 主创分别维护请求中的成员和当前显示的成员；只有当前请求成功才提交背景及人物资料，错误时提供重试。

- [ ] 写加载器测试，使用可控 Image 替身覆盖成功去重、decode 等待、失败后重试及 15 秒超时；先运行确认失败。
- [ ] 实现加载器与交接组件；不进行图片编码、不改图片源文件。
- [ ] 首页定时轮播使用准备后的图片，切换时保留旧图；隐藏标签页及减少动态效果时停止自动轮播。
- [ ] 主创切换防止过期结果覆盖；保留旧资料与背景到交接时刻，加载失败提供轻量提示和重试，不碰编辑 API。
- [ ] 运行 `node --experimental-strip-types --test tests/image-loader.test.ts` 和 `npm run build`，均应通过。
- [ ] 浏览器验证慢网、快速连点、首图失败及减少动态效果；检查无黑闪、图片与人物资料同步。
- [ ] 审查本任务 diff，仅提交本任务文件到本地 Git，不 push。

## Task 2: 整理 CSS 层叠而不改视觉

**Files:** Modify `src/styles.css`, `src/guests.css`, `src/years.css`, `src/moments.css`; create `docs/qa/2026-10-24-style-baseline.md`.

**Interfaces:** 保留现有 class 名和组件结构；Task 1 的交接样式归其独立文件，Task 3 的胶卷样式归 moments.css。各页面专用样式不覆盖其他页面。

- [ ] 在上述五组屏幕尺寸记录整理前的布局/截图，以及主创资料面板、雷达、嘉宾卡、纪年列宽的关键计算样式。
- [ ] 逐个合并相同选择器的过时规则，先确认 cascade、媒体条件、选择器优先级及简写/长写关系；不要把所有 media 块简单移到文件末尾。
- [ ] 移除被新版交接替代的整屏 blur 动画。保留个人背景、当前手机顶部横图和各页已经确认的色彩/密度。
- [ ] 对照基线检查同一视口、访问顺序及手机/桌面布局；若浏览器不可用，只进行可证明等价的规则整理，标注未验证部分，不宣称视觉完全一致。
- [ ] 运行 `npm run build`、`git diff --check`；检查所有图片文件均未修改。
- [ ] 审查并在本地提交本任务文件，不 push。

## Task 3: 有限窗口、恒定速度的交互胶卷

**Files:** Create `src/film/film-layout.ts`, `src/film/FilmReel.tsx`, `src/film/PhotoViewer.tsx`, `tests/film-layout.test.ts`; modify `src/MomentsPage.tsx`, `src/moments.css`.

**Interfaces:**
- `frameAt(slot: number, count: number): number | null`：循环索引，空集合返回 null。
- `visibleSlots(offset: number, viewportWidth: number, frameWidth: number, gap: number): number[]`：仅返回可见区及两侧各两格缓冲槽。
- `advanceOffset(offset: number, elapsedMs: number, speed: number, direction: -1 | 1): number`：以像素/秒推进，不依赖照片总数。
- `FilmReel` 接收照片、方向、速度、暂停及查看回调；`PhotoViewer` 只查看已有图片 URL，使用 contain，不重新压缩。

- [ ] 编写计算测试：空列表无索引；单张重复索引为 0；负索引正确循环；100 张与 5 张在同时间内位移相等；100 张不生成 100 张或 1200 张 DOM。先运行确认失败。
- [ ] 实现计算与有限窗口组件，保留三行 16:9、第一/三行向左、第二行向右；速度分别为 28/24/30 像素每秒。
- [ ] 静态照片立即可见，上传照片后台加载；请求失败仍可浏览静态照片；合并数据时尽量保持当前照片位置。
- [ ] 增加统一暂停/继续；悬停、键盘聚焦、打开大图、编辑、标签页隐藏、屏外时暂停。减少动态效果默认停止，仍可手动浏览。
- [ ] 支持横向拖动，保留手机纵向滚页；拖动后不误触打开。图片可键盘打开，大图支持 Escape、关闭、前后张、焦点约束与恢复；关闭不重置胶卷位置。
- [ ] 运行 `node --experimental-strip-types --test tests/film-layout.test.ts` 和 `npm run build`；浏览器验证 0/1/5/100 张、暂停/拖动/编辑/放大、手机和键盘行为。
- [ ] 审查并在本地提交本任务文件，不 push。

## Final verification

- [ ] 统一运行两组测试、`npm run build` 和 `git diff --check`。
- [ ] 确认无图片、数据库、密码、后台或 API 写入方面的变更。
- [ ] 独立审查快速切换竞态、CSS 回归和胶卷交互；修复可复现问题。
- [ ] 提供本地预览、已通过的检查及实际验证限制。线上版本保持不变。
