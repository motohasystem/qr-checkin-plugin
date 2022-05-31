# qr-checkin-plugin

iPadをQRチェックイン/チェックアウト端末化するkintoneプラグインです。

kitnoneに適用することで、QRコード読み取り機能を備えたチェックポイント端末化します。カメラ付きのノートPCやiPadなどでご利用ください。

チェックインの前にチェックアウトが必要な双方向チェックスタイルと、何回でも連続でチェックイン可能な一方向チェックスタイルを選ぶことができます。

主にコーダー道場の入退室管理に使う目的で開発しました。

# 設定方法

こちらのアプリテンプレートを参考にkintoneアプリを構築してください。

- アプリ1: 参加記録
- アプリ2: 名簿

参加記録アプリでは、名簿アプリの名簿IDをルックアップしてチェックイン/チェックアウトを記録します。
それ以外の名簿情報や参加記録情報は自由にフィールドを追加することができます。

# 使い方

![一覧画面のチェックインボタン](docs/images/01_checkin_button.png)

プラグインを適用すると、一覧画面の上部にチェックインボタンが表示されます。ボタンを押してチェックイン画面に入ります。

![チェックインダイアログ2](docs/images/02_checkin_dialog.png)

カメラ画像にQRコードをかざすと読み取りが行われ、対応するIDが会員名簿アプリにあれば取得した情報とともに参加記録アプリに記録します。

# 設定項目

アプリにプラグインを適用後、下記の項目を設定してください。

- タイトル
    - QRリーダーに表示するタイトル文字列です。
- チェックインフィールド
    - チェックインの日時を格納する日時フィールドを選択します
- チェックアウトフィールド
    - チェックアウトの日時を格納する日時フィールドを選択します
- メンバーIDフィールド
    - QRコードを読み込むルックアップフィールドを選択します
- チェックスタイル（ラジオボタン）
    - 双方向
    - 一方向
- 閉じる挙動のカスタマイズ（チェックボックス）
    - ボタンで閉じる
        - 有効にするとQRリーダーにCloseボタンを表示します
    - 画面のダブルクリックで閉じる
        - QRリーダー画面上をダブルクリックで閉じます。
    - 3本指のマルチタップで閉じる(iOS)
        - iPadなどで、3本指のマルチタッチによってQRリーダーを閉じます。
- ガードレール: 多重チェックイン回避
    - 指定秒数（ミリ秒）の間、同一IDの連続チェックインを回避します。
    - 指定時間内であっても別IDのチェックインを挟むとチェックイン可能です。

# このプラグインの中で利用しているOSSのライセンス情報

- jQuery - https://jquery.com/
    MIT License
- MicroModal    - https://github.com/Ghosh/micromodal
    MIT license
- noSleep   - https://github.com/richtr/NoSleep.js/
    MIT license
- jsQR  - https://github.com/cozmo/jsQR
    Apache-2.0 license
- 51-modern-default.css https://github.com/kintone-samples/plugin-samples/blob/master/stylesheet/51-modern-default.css
    MIT license

# プラグインのアイコンについて

iconeさまの公開されているアイコンを使わせていただいています。

https://icone.unique-work.com/

https://twitter.com/ICONE_by_UW

# このプラグインのライセンス / Licensing of this plug-in

このプラグインはMITライセンスの元で公開しています。
This plugin is licensed under MIT license.

Copyright (c) 2022 Daisuke Motohashi
https://opensource.org/licenses/MIT
