# quant-nav

量化交易系统网站导航。集中登记调度、数据、研究、回测和交易等网站，之后从入口卡片直接打开。

## 使用

直接在浏览器打开 `index.html`。点击「添加网站」登记网站名称和网址。未配置网址的卡片可点「填写网址」补充，已配置的卡片会显示「打开网站」。地址支持 `https://`、`http://`、本机服务地址（例如 `localhost:8080`）和本地网页地址（例如 `file:///D:/tool/dataset/catalog/index.html`）。设置为常用的网站会显示在页面上方。

网站配置保存在当前浏览器的本地存储中。不同浏览器或设备之间不会自动同步。

## 本机后台服务

运行 `scripts/install-startup-task.ps1` 会创建并立即启动 Windows 登录任务。当前用户登录 Windows 后，任务会在后台启动网站服务，服务异常退出时任务会重试。使用 `http://quant-nav.localhost:8765/` 访问。用户登录后服务才会启动。

## 以后绑定正式域名

本地服务默认只监听 `127.0.0.1`，不会暴露到局域网或公网。数据资产目录通过 `/data-assets/` 路径提供，仅映射 `D:\tool\dataset\catalog`。服务器地址和端口可以通过 `QUANT_NAV_HOST` 与 `QUANT_NAV_PORT` 环境变量调整。正式部署时建议把服务放在公网主机的 HTTPS 反向代理之后，并将 `quant-nav.com` 的 DNS 指向该主机。注册域名和配置 DNS 后，导航入口的保存格式仍然可以直接使用正式 HTTPS 地址。

`quant-nav.localhost` 是仅本机使用的别名。正式 `.com` 地址当前没有注册记录，尚未进行域名购买或公网 DNS 配置。

- `scripts/status.ps1`：检查服务状态
- `scripts/stop.ps1`：停止服务
- `scripts/start.ps1`：立即启动服务

## 目录

- `index.html`：量化系统导航网站
- `assets/`：页面样式和交互逻辑
- `data/links.js`：默认网站清单，可直接维护名称、分类和网址
- `docs/architecture/`：原有量化交易系统架构图源文件及 SVG
