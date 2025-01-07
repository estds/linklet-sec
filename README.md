## 介绍

一个使用 Cloudflare Pages 创建的 URL 缩短器

*演示站点* : [linklet.pages.dev](https://linklet.pages.dev)

### 1.利用 Cloudflare Pages 部署

1. Fork [linklet 仓库](https://github.com/HarrisonWang/linklet.git)。
2. 登录到 [Cloudflare](https://dash.cloudflare.com) 控制台。
3. 在 Cloudflare 控制台，选择 <kbd>Workers & Pages</kbd> > <kbd>Create application</kbd> > <kbd>Pages</kbd> > <kbd>Connect to Git</kbd>。
4. 选择 Fork 的仓库，若没有该仓库，请点击 [Cloudflare Pages 链接](https://github.com/settings/installations/46795069)配置 Cloudflare 访问个人的 GitHub 仓库权限。
5. 选中 Fork 的仓库，点击<kbd>Begin setup</kbd>完成部署。
6. 在 Cloudflare 控制台创建 D1 数据库，依次点击 <kbd>Workers & Pages</kbd> > <kbd>D1</kbd> > <kbd>Create database</kbd> > <kbd>Dashboard</kbd>，输入 Database name 点击 <kbd>Create</kbd> 完成数据库的创建。
7. 点击 <kbd>Console</kbd>，输入以下 SQL 命令创建表：

```sql
DROP TABLE IF EXISTS links;
CREATE TABLE IF NOT EXISTS links (
  `id` integer PRIMARY KEY NOT NULL,
  `url` text,
  `slug` text,
  `ua` text,
  `ip` text,
  `status` int,
  `create_time` DATE
);
DROP TABLE IF EXISTS logs;
CREATE TABLE IF NOT EXISTS logs (
  `id` integer PRIMARY KEY NOT NULL,
  `url` text ,
  `slug` text,
  `referer` text,
  `ua` text ,
  `ip` text ,
  `create_time` DATE
);
```

8. 选择部署完成的 linklet 项目，在 Cloudflare 控制台依次点击<kbd>Settings</kbd> > <kbd>Functions</kbd> > <kbd>Add bindings</kbd>，输入 Variable name 值 **DB** 并选择 D1 Database **linklet**，点击 <kbd>Save</kbd> 保存，设置如下表：

    | Variable name | D1 database |
    | :------------ | :---------- |
    | DB            | linklet     |

9. 为了生效 D1 数据库配置，需完成项目的重新部署。

### 2.API 方式生成短网址

请求：

```http
### 生成随机短链接
POST https://linklet.pages.dev/create
Content-Type: application/json

{
  "url": "https://ollama.com/blog/how-to-prompt-code-llama"
}

### 生成指定 slug 短链接
POST https://linklet.pages.dev/create
Content-Type: application/json

{
  "url": "https://ollama.com/blog/how-to-prompt-code-llama",
  "slug": "llama"
}

```

响应：

```json
{
  "slug": "<slug>",
  "link": "http://linklet.pages.dev/<slug>"
}
```
