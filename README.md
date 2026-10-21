# 做饭指南 App（Cook Guide）

一个完全离线的安卓菜谱应用，数据来自开源项目 [HowToCook（程序员做饭指南）](https://github.com/Anduin2017/HowToCook)。

- 372 道家常菜谱（含难度、卡路里、用时、用料、分组步骤）
- 179 张压缩配图，全部打包进 APK，**无需网络权限**
- Java WebView 壳（本地资源拦截）+ 原生 HTML/CSS/JS 界面，无任何第三方依赖

## 功能

- 🎲 随机选菜 / 按日期的每日推荐
- 🔍 按菜名、食材搜索
- 🧺 备料勾选清单，份量缩放（半份 / 1 / 2 / 3 份，用量自动换算）
- 👨‍🍳 烹饪模式：大字逐步显示、进度条、保持屏幕常亮
- ⏱️ 自动识别步骤时长，一键计时（悬浮计时器，到点震动提醒）
- ★ 按难度 / 热量排序，新手友好与低卡轻食专区
- ❤️ 收藏与浏览历史（本地存储）
- 🌙 深色模式、字号调节

## 构建

无需 Android Studio / Gradle，纯命令行构建：

1. 准备 JDK 17 与 Android SDK（`platforms;android-34` + `build-tools;34.0.0`），工具链建议放在**不含中文的路径**。
2. 修改 `build.sh` 顶部的 `SDK` / `JAVA_HOME_DIR` 路径。
3. 运行：

```bash
bash build.sh
```

产物为签名好的 `CookGuide.apk`（minSdk 26 / targetSdk 34）。

### 数据重新生成（可选）

- `tools/parse.py`：从 HowToCook 仓库解析菜谱为 `recipes.json`
- `tools/resize.ps1`：用系统 .NET 批量压缩配图

## 目录结构

```
app/src/main/
├── AndroidManifest.xml
├── java/cn/cook/guide/MainActivity.java   # WebView 壳 + Bridge
├── res/                                    # 图标、主题
└── assets/www/                             # 界面与数据
    ├── index.html / style.css / app.js
    ├── data/recipes.json
    └── img/
```

## 许可与致谢

- 菜谱内容：[Anduin2017/HowToCook](https://github.com/Anduin2017/HowToCook)（CC BY-NC-SA 4.0），本项目仅做离线整理与界面重制，非商业用途。
- 应用代码：MIT
