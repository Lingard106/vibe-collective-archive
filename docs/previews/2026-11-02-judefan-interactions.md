# 槽阻互动预览 · 2026-11-02

## 用户需求

- 静息时随机、不时触发参考图一的捧腹大笑。
- 点击人物，随机触发原背景的指向动作，或参考图二的一手收腹、一手向外展开姿势。
- 延续当前主创页的原画、背景和 UI；先交付本地预览，不自动上线。

## 实现选择

- 空闲 10–19 秒后触发一次笑，结束后重新等待随机间隔。
- 两个点击动作各约 50%；每次点击单独选择并入队。
- 点击发生在闲置笑中时，先短暂平滑回位再执行点击动作。
- 采用已有原画分层 / Canvas 2.5D 方案；不是新建粗糙 3D 模型或整图换帧。
- 新素材以无损 WebP 保存，不重压原背景；只在人物原轮廓内使用局部环境补片。

## 新素材与生成提示

本次通过内置 imagegen 生成，原始输出保留在本机 Codex generated_images 会话目录。以下是实际生成提示的约束摘要；参考输入为原角色图及用户提供的两张姿态图。

- `src/world-preview/assets/judefan-poses-v1.webp`（1330×1182，透明）：2×2 等分动作图集，左上自然站立、右上捧腹大笑、左下还原原图指向动作、右下张掌姿态。锁定黑短发、方眼镜、棕色棒球夹克 / 米白袖、黑裤和白鞋；仅参考黄色角色的动作，不复制其身体或截图文字。四格保持一致人物比例、相机和服装。渲染时按部件轮廓裁切，不直接使用边缘杂色。
- `src/world-preview/assets/judefan-clean-patch-v1.webp`（440×705）：由原图移除人物后的背景参考提取 `(350,225,440,705)`，只用于擦除原人物区域。提示要求保留南开校园、天空、石路、书籍、足球、旗帜、文字及所有其他场景元素，不改构图。

## 本地入口

- 默认随机互动：`/previews/member-portrait.html?member=judefan`
- 笑的定格检查：追加 `&judeAction=laugh&judeFrame=2`
- 原动作检查：追加 `&judeAction=original&judeFrame=2`
- 张掌动作检查：追加 `&judeAction=salute&judeFrame=2`

上述定格参数仅供开发预览，不改变正式成员数据或其他成员动作。

## 验证记录

- 动作控制器：1,623 个姿态帧通过；100 个排队点击无丢失，闲置动作被点击打断时平滑回位，减少动画模式保持静态。
- 骨骼：1,623 帧通过，最短臂骨 31px、最高关节点速度 275.3px/s；脚底落地、首尾连续。
- 浏览器像素检查：183 帧、26,169 个躯干 / 肢体内部样本，最低 alpha 252（要求 ≥250），缺口样本 0。工具只验证内部覆盖，最终纹理和遮挡另做目视检查。
- 桌面三个关键姿势通过完整场景检查；已修正旧指向手臂残影、远侧前臂被躯干覆盖的问题。
- 390×844 iframe 用真实媒体查询检查默认 / 笑 / 张掌；手机 cover 层能点击，隐藏背景层保持暂停且不分配绘制器。
- 桌面实际两次点击最终 accepted=2 / started=2 / pending=0，随后自动静息动作 idleStarted=1；100 次完整出队由纯时钟回归测试覆盖。
- 林加德、西瓜既有动作回归和 `npm run build` 通过。生产入口仍为 `index-Bp2XRp02.js`，新角色只挂载在本地 portrait-main 预览，未修改 `MembersPage.tsx` 或部署。
- 独立审查指出的“仅设置 judeAction 后仍接受点击但不响应”和最右手掌命中边界问题已修正：动作检查默认定格 2 秒，人物点击范围采用完整画布加逐像素 alpha 命中。
- 后台浏览器的 RAF 会受节流，工具观测帧率不代表用户前台设备帧率；未据此声称固定 60fps。
- 已修正抬掌中间帧的手掌重影：两张手部纹理先映射到同一个连续变化的轮廓，再在独立缓冲层合成；不在人物上直接透明叠加两只手。动作保持阶段仍使用原生清晰的完整手部裁片。

## 后续动作迭代：先跳起，再落地摆姿势

- 仅修改图二的张掌动作；静息笑和原图指向不变，未新增 / 重压图片。
- 张掌动作调整为 6.5 秒：先屈膝蓄力，0.50–1.45 秒腾空，1.45 秒接地，接地后髋膝下沉缓冲并顺势张掌，之后保持和回位。
- 根部最大跃起 28 个原生人物像素，配合脚部内收实际离地 36px；根据当前顶部成员条留白控制高度，避免头发被导航挡住。
- 腾空时加摆臂 / 收臂，阴影随高度缩小变淡；落地阴影扩散并恢复接触感。
- Canvas 向上扩展 64px，绘制、SVG 位置、人物点击命中和像素检查坐标同步补偿；静息站位未移动。
- 回归更新至 1,693 帧，94 个离地采样帧；最高跳跃速度 90.7px/s，最高关节点速度 275.3px/s，保留原先 300px/s 速度限制。
- 更新后 183 帧 / 26,169 个内部像素检查通过，最低 alpha 252、缺口 0。仍仅用于本地预览，未部署。

## 发布确认 · 2026-11-03

- 用户确认可上线：将已预览通过的槽阻动画接入正式主创页，只为 `judefan` 添加按需加载分支；其他人物、背景和 UI 不变。上文“仅本地预览 / 未部署”描述的是当时的检查阶段。
- 西瓜头顶省略号改成三个像素点依次亮起、轻微上浮的 1.6 秒循环。只覆盖原点位并复用原图的空白气泡纸面；没有重压或替换背景。
- 省略号复用西瓜现有可暂停时钟，不增加动画循环；隐藏页面和隐藏尺寸层暂停，减少动态效果模式保持静态。
- 新增 `scripts/check-melon-bubble.mjs` 检查循环首尾、相位顺序、位移 / 透明度边界、静态模式与非法时间输入。

## 实际生成提示

内置 imagegen，姿态图集启用透明背景：

```text
Use case: stylized-concept. Asset type: 2x2 registered animation key-pose atlas, transparent PNG. Image1 is the EXACT CHARACTER IDENTITY AND RENDER STYLE reference: the human voxel/Minecraft young man, tidy chunky short black fringe, black rectangular glasses, cheerful smile, brown varsity jacket with ivory sleeves, striped dark collar/cuffs/hem, white T shirt, black loose trousers with a small white script on thigh, chunky white/gray sneakers. Images2 and3 are ONLY GESTURE references; do NOT depict the yellow creature, screenshot UI, counters, text, rounded belly, or change human anatomy. Generate ONLY this SAME HUMAN CHARACTER in four equal separate cells in a 2x2 atlas on a truly transparent background, no contact sheet labels, no shadows/background/props. Camera fixed front three-quarter matching image1, same proportions and head size as image1, same hairstyle/clothes/shading in all4cells. Full body in every cell, no cropped fingers/feet, identical body scale and grounded foot line. TOP LEFT: natural relaxed standing, arms lowered gently, small warm smile. TOP RIGHT: belly-laugh reference2, both hands together on belly, shoulders lifted, lean BACK slightly, narrowed smiling eyes behind glasses, open laughing mouth, natural bent elbows, laughing not coughing. BOTTOM LEFT: reproduce original image1 pose EXACTLY: one arm extends diagonally up toward viewer right with pointing index finger, other forearm crosses chest and points same way. BOTTOM RIGHT: gesture from image3, legs slightly wider/knees gently flexed, one fist gently near belly, opposite forearm extended to viewer right with open palm facing outward, comic theatrical pause, amused expression. Every cell must contain only ONE human. Original MC proportions: large square head, trim normal-sized body, cuboid angular articulated arms and hands, no swollen belly, no extra limbs, preserve detailed jacket seams, finger knuckles and shoe details. Match polished sunset-lit voxel materials, use warm neutral directional lighting as source. Transparent spaces between cells; center each character at corresponding cell center for source registration.
```

背景补片生成，不启用透明背景：

```text
Use case: precise-object-edit. Asset: clean background plate for the existing interactive website, EXACT1672x940 composition. This is an INPAINT edit of the supplied original. Remove ONLY the foreground Minecraft human man including his black hair, glasses, both arms and pointing hands, brown varsity jacket, black trousers, white shoes and his cast shadow. Naturally reconstruct the cobblestone campus walkway, shrubs, purple trees and distant buildings previously hidden behind him. Preserve ALL other pixels/composition, Nankai campus buildings, original Chinese text, purple flag at left, purple sunset clouds, foreground books/trophies/cup/ball at right, perspective, lighting, resolution, materialsharpness. Do not change scene style, crop, zoom, add figures or objects. Human removal mask approximately x360..770,y230..925, only subject not neighboring environment. Output is a clean matching BACKGROUND with NO foreground person, not an alternative scene. It will only be used under the precisely masked original human silhouette, so continuity of stone pavement and foliage matters greatly.
```
