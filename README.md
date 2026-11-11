# 地表最强玩家网站

首页、`gameinfo.html` 和 `activities.html` 为静态网页。伙伴、福袋和礼包资料保存在 `catalog.js`，活动奖励保存在 `activity-data.js`，公告保存在 `content.js`。网站不连接游戏数据库或管理后台，也不提供下载和注册入口。

`catalog.js` 依据 2026 年 11 月 11 日核验的本服只读资源及活动内容快照生成。内容不代表实时上架或活动状态；随机福袋不公开猜测概率，实际内容以游戏内为准。`tools/build-catalog.ps1` 需要调用者提供已核验的资源路径和指纹，只读取这些资源并输出网页所需字段。

网站主视觉由内置 imagegen 依据国服官网主视觉的构图和风格生成，素材位于 `assets/portal-hero.png`。完整提示词：

> Use case: ads-marketing. Asset type: panoramic hero artwork for a desktop Chinese fantasy online game portal. Image 1 is a visual reference for the official Wonderland Online website's brightly colored, detailed 2D anime game illustration and ensemble composition. Create a NEW original illustration in that lively nostalgic turn-based MMORPG portal style, not a copy of its text or campaign. A vibrant blue sky and ocean, tropical island and castle, a heroic fantasy party of distinct young adventurers, whimsical companions and a dragon, rich clean character details and saturated aqua blue, sunny gold and warm coral. Compose as a very wide horizontal banner: heroic figures grouped left and right with breathing room and a softly lit clear center where website title text can be added separately. Make it look like polished early-2000s Chinese PC online game key art with playful proportions, bright fantasy colors and elegant heroic energy. NO text, letters, numbers, logos, slogans, dates, interface, watermarks or advertising.

`assets/wlo-logo.png` 是用户提供的国服官网所展示的游戏标识；伙伴图片使用本项目已有素材。本站为地表最强玩家交流网站，与参考官网分别运营。

活动奖励取自 2026 年 11 月 11 日的本服配置快照，覆盖十二宫第 4–12 宫与最终宝箱、勇闯 30 关第 5–30 关、宙斯、海盗来袭和夺宝大作战。活动页面区分固定、任选与随机奖励，并列出同一快照中的北京时间面板时段。网站不会自动同步运营配置，开放时间、入场条件和后续奖励变化以游戏内为准。`tools/build-reward-data.ps1` 从调用者指定的只读快照生成奖励资料及道具图标；图标由本服客户端原生资源提取，绿色透明色已处理。

54 张普通伙伴形态图片取自用户提供的参考站公开的游戏图片，使用本服 NPC 记录与已解析国服记录的图号和配色逐项比对，结果位于 `assets/pets/`。本服测试中的吕布与玄风使用项目现有图片，页面明确标注测试状态。`tools/fetch-pet-art.cjs` 可在提供相应只读 NPC 文件时重建伙伴图片映射。

活动配图 `assets/activities.jpg` 由内置 imagegen 生成。完整提示词：

> Use case: ads-marketing. Asset type: wide illustration for the activity section of a Chinese Wonderland Online-inspired fantasy MMORPG player website. Create a NEW, vibrant, nostalgic 2D anime game illustration with a coherent panorama comprising three visually distinct connected regions from left to right: golden zodiac temple guarded by armored warriors, a dramatic pirate ship on a sunny blue sea, and a white marble sky temple with lightning. Adventurer party, whimsical game atmosphere, colorful aqua, gold, warm orange, cinematic light. The image will be used as a section banner behind real website text; keep important subjects clear, clean and legible at small sizes. No text, letters, digits, logos, schedules, rewards, interface or watermark.

GitHub Pages 使用 `main` 分支。Render 静态站点使用相同仓库，但当前配置为手动部署；推送新内容后，需要在 Render 为该站点发起新部署并验证。
