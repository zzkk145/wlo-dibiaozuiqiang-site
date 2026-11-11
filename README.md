# 地表最强玩家网站

首页、`gameinfo.html` 和 `activities.html` 为静态网页。伙伴、福袋和礼包资料保存在 `catalog.js`，活动奖励保存在 `activity-data.js`，公告保存在 `content.js`。网站不连接游戏数据库或管理后台，也不提供下载和注册入口。

`catalog.js` 依据 2026 年 11 月 11 日核验的本服只读资源及活动内容快照生成。伙伴包括本服转生配置、可捕捉记录、兑换券关联和参考站图鉴中可在本服核对的记录。福袋和礼包同时收录已核对内容与物品资料，尚未确定的内容在页面标明。资料不代表实时上架，实际开放状态以游戏内为准。`tools/expand-catalog.ps1` 需要调用者指定已核验资源、配置和源码提交，只读取这些输入并输出网页所需字段。

网站主视觉由内置 imagegen 依据国服官网主视觉的构图和风格生成，素材位于 `assets/portal-hero.png`。完整提示词：

> Use case: ads-marketing. Asset type: panoramic hero artwork for a desktop Chinese fantasy online game portal. Image 1 is a visual reference for the official Wonderland Online website's brightly colored, detailed 2D anime game illustration and ensemble composition. Create a NEW original illustration in that lively nostalgic turn-based MMORPG portal style, not a copy of its text or campaign. A vibrant blue sky and ocean, tropical island and castle, a heroic fantasy party of distinct young adventurers, whimsical companions and a dragon, rich clean character details and saturated aqua blue, sunny gold and warm coral. Compose as a very wide horizontal banner: heroic figures grouped left and right with breathing room and a softly lit clear center where website title text can be added separately. Make it look like polished early-2000s Chinese PC online game key art with playful proportions, bright fantasy colors and elegant heroic energy. NO text, letters, numbers, logos, slogans, dates, interface, watermarks or advertising.

`assets/wlo-logo.png` 是用户提供的国服官网所展示的游戏标识；伙伴图片使用本项目已有素材。本站为地表最强玩家交流网站，与参考官网分别运营。

活动奖励取自 2026 年 11 月 11 日的本服配置快照，包含十二宫、勇闯 30 关、宙斯、海盗、夺宝、协力战、神庭回响、世界 PK、副本、福利活动、限时掉落、线上抽奖、新手福利、活动兑换及游戏屋。活动页面区分固定、任选与随机奖励，并列出同一快照中的北京时间面板时段。网站不会自动同步运营配置，开放时间、入场条件和后续奖励变化以游戏内为准。`tools/build-reward-data.ps1` 从调用者指定的只读快照生成奖励资料及道具图标；图标由本服客户端原生资源提取，绿色透明色已处理。

伙伴形态优先使用用户提供的参考站公开游戏图片，按本服 NPC 图号和四组配色逐项匹配，结果位于 `assets/pets/`。未找到同配色图片的形态使用签名客户端及共享基线中的原生基础模型，图片位于 `assets/pet-models/`，页面注明颜色以游戏内为准。本服测试中的吕布与玄风使用项目已有模型，页面明确标注测试状态。`tools/fetch-pet-art.cjs` 和 `tools/export-native-models.cjs` 分别重建映射与基础模型。

活动配图 `assets/activities.jpg` 由内置 imagegen 生成。完整提示词：

> Use case: ads-marketing. Asset type: wide illustration for the activity section of a Chinese Wonderland Online-inspired fantasy MMORPG player website. Create a NEW, vibrant, nostalgic 2D anime game illustration with a coherent panorama comprising three visually distinct connected regions from left to right: golden zodiac temple guarded by armored warriors, a dramatic pirate ship on a sunny blue sea, and a white marble sky temple with lightning. Adventurer party, whimsical game atmosphere, colorful aqua, gold, warm orange, cinematic light. The image will be used as a section banner behind real website text; keep important subjects clear, clean and legible at small sizes. No text, letters, digits, logos, schedules, rewards, interface or watermark.

GitHub Pages 使用 `main` 分支。Render 静态站点使用相同仓库，但当前配置为手动部署；推送新内容后，需要在 Render 为该站点发起新部署并验证。
