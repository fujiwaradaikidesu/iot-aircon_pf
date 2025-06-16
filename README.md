# IoT Aircon Controller

## 概要
このプロジェクトは、IoTテクノロジーを活用してエアコンをスマートに制御するためのシステムです。TypeScriptとPythonを使用して、エアコンのリモート制御、温度管理、スケジュール設定などの機能を実現します。
meloncookie様の赤外線通信用ライブラリ( https://github.com/meloncookie/RemotePy.git )を利用させて頂いております。

## 特徴
- 💻 TypeScriptベースのフロントエンドで直感的なUI/UX
- 🐍 Pythonベースのバックエンドで安定したデバイス制御
- 🌡️ リアルタイムの温度モニタリングと制御
- ⏰ スケジュール設定による自動制御
- 📱 レスポンシブデザインによるマルチデバイス対応

## システム要件
### フロントエンド
- Node.js 18.x以上
- TypeScript 4.x以上
- その他の依存パッケージ（package.jsonを参照）

### バックエンド
- Python 3.8以上
- 必要なPythonパッケージ（requirements.txtを参照）

## インストール方法

```bash
# リポジトリのクローン
git clone https://github.com/fujiwaradaikidesu/iot-aircon.git
cd iot-aircon

# フロントエンドのセットアップ
cd frontend
npm install

# バックエンドのセットアップ
cd ../backend
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
pip install -r requirements.txt
```

## 使い方

### フロントエンドの起動

```bash
cd frontend
npm run dev
```

### バックエンドの起動

```bash
cd backend
python main.py
```

## 設定

`config.json`ファイルで以下の設定が可能です：
- エアコンのIPアドレス
- 制御パラメータ
- スケジュール設定
- その他の環境設定

## 開発者向け情報

### プロジェクト構成
```
iot-aircon/
├── frontend/          # TypeScriptベースのフロントエンド
├── backend/           # Pythonベースのバックエンド
├── docs/             # ドキュメント
└── config/           # 設定ファイル
```

### 技術スタック
- フロントエンド
  - TypeScript
  - React/Next.js
  - CSS（スタイリング）
- バックエンド
  - Python
  - FastAPI/Flask
  - デバイス制御ライブラリ

