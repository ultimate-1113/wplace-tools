# wplace道路ツール

ローカルビルドは `npm ci`、`npm test`、`npm run build` の順に実行します。Pages のビルドコマンドは `npm run build`、出力先は `dist` です。Functions はリポジトリ直下の `functions` を使用します。

## D1 とプレビュー

Pages の Preview と Production に別々の D1 データベースを用意し、それぞれ `DB` という名前でバインドします。各 DB に未適用のマイグレーションを適用してからデプロイしてください。新しいローカル環境では以下を使用します。

```sh
npx wrangler d1 migrations apply DB --config wrangler.local.jsonc --local
npx wrangler pages dev dist --d1 DB=local-DB
```

Pages の本番とプレビューには互換フラグ `nodejs_compat` を設定します。.wplace は UTF-8 で1,500,000バイトまでです。サイトの「アップロードして一覧に公開」または MCP の `upload_template` で一般投稿できます。「共有リンクを発行」と `share_template` はリンク限定です。公式マークは運営が D1 の official を1に設定した作品にだけ付きます。

## MCP

共有 ID は公開区分と .wplace の UTF-8 本文を SHA-256 でハッシュし、先頭96ビットを Base64URL で表した16文字です。同じ公開区分・同じ本文ならサイトと MCP で同じ URL になります。空白や設置地点を変えたファイルは別 ID です。

道路作図では中心線の半径・緩和区間長を世界ピクセルで指定します。円弧は真北0度から時計回り、クロソイドの3点は進入・交点・退出の順です。1枚の出力は最大4,194,304画素で、世界座標の外に出る図案は入力エラーになります。縁幅は道幅に含まれます。

接続先は公開ドメインの `/mcp`（Streamable HTTP）です。tools/list で入力仕様を取得できます。共有の requestKey は呼び出し側で UUID を生成し、再送時は同じ値を指定します。日時のオフセット省略時は日本時間です。

## 公開切り替え

プレビューで既存の6経路・新規2ページ・MCP・共有を確認し、生成したファイルを wplace の Overlays で読み込んで配置と色を確認します。従来の DNS レコードを記録し、Pages に rc-tools.wplaceoki.com を登録してから DNS を切り替えます。既存の計測タグを使うため、Pages 側でビーコンの自動追加を重複させないでください。
