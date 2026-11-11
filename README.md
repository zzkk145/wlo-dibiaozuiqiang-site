# 地表最强玩家网站

首页与 `gameinfo.html` 为静态网页。伙伴、福袋和礼包资料保存在 `catalog.js`；公告保存在 `content.js`。网站不连接游戏数据库或管理后台，也不提供下载和注册入口。

`catalog.js` 依据 2026 年 11 月 11 日核验的本服只读资源及活动内容快照生成。内容不代表实时上架或活动状态；随机福袋不公开猜测概率，实际内容以游戏内为准。`tools/build-catalog.ps1` 需要调用者提供已核验的资源路径和指纹，只读取这些资源并输出网页所需字段。

网站主视觉由内置 imagegen 依据国服官网主视觉的构图和风格生成，素材位于 `assets/portal-hero.png`。完整提示词：

> Use case: ads-marketing. Asset type: panoramic hero artwork for a desktop Chinese fantasy online game portal. Image 1 is a visual reference for the official Wonderland Online website's brightly colored, detailed 2D anime game illustration and ensemble composition. Create a NEW original illustration in that lively nostalgic turn-based MMORPG portal style, not a copy of its text or campaign. A vibrant blue sky and ocean, tropical island and castle, a heroic fantasy party of distinct young adventurers, whimsical companions and a dragon, rich clean character details and saturated aqua blue, sunny gold and warm coral. Compose as a very wide horizontal banner: heroic figures grouped left and right with breathing room and a softly lit clear center where website title text can be added separately. Make it look like polished early-2000s Chinese PC online game key art with playful proportions, bright fantasy colors and elegant heroic energy. NO text, letters, numbers, logos, slogans, dates, interface, watermarks or advertising.

`assets/wlo-logo.png` 是用户提供的国服官网所展示的游戏标识；伙伴图片使用本项目已有素材。本站为地表最强玩家交流网站，与参考官网分别运营。

GitHub Pages 使用 `main` 分支。Render 静态站点使用相同仓库，但当前配置为手动部署；推送新内容后，需要在 Render 为该站点发起新部署并验证。
