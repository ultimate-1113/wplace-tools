# wplace道路ツール

ローカルビルドは `npm ci`、`npm test`、`npm run build` の順に実行します。Pages のビルドコマンドは `npm run build`、出力先は `dist` です。Functions はリポジトリ直下の `functions` を使用します。

## D1 とプレビュー

Pages の Preview と Production に別々の D1 データベースを用意し、それぞれ `DB` という名前でバインドします。各 DB に `migrations/0001_templates.sql` を適用してからデプロイしてください。ローカルでは以下を使用します。

```sh
npx wrangler d1 execute DB --config wrangler.local.jsonc --local --file migrations/0001_templates.sql
npx wrangler pages dev dist --d1 DB=local-DB --compatibility-flags nodejs_compat --compatibility-date 2026-04-01
```

Pages の本番とプレビューには互換フラグ `nodejs_compat` を設定します。共有ファイルは UTF-8 で1,500,000バイトまでです。一般投稿はリンク限定で、公式に掲載する作品は運営が対応する行の official を1に設定します。

## MCP

道路作図では中心線の半径・緩和区間長を世界ピクセルで指定します。円弧は真北0度から時計回り、クロソイドの3点は進入・交点・退出の順です。1枚の出力は最大4,194,304画素で、世界座標の外に出る図案は入力エラーになります。縁幅は道幅に含まれます。

接続先は公開ドメインの `/mcp`（Streamable HTTP）です。tools/list で入力仕様を取得できます。共有の requestKey は呼び出し側で UUID を生成し、再送時は同じ値を指定します。日時のオフセット省略時は日本時間です。

## 公開切り替え

プレビューで既存の6経路・新規2ページ・MCP・共有を確認し、生成したファイルを wplace の Overlays で読み込んで配置と色を確認します。従来の DNS レコードを記録し、Pages に rc-tools.wplaceoki.com を登録してから DNS を切り替えます。既存の計測タグを使うため、Pages 側でビーコンの自動追加を重複させないでください。
