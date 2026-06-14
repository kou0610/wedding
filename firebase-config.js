// ════════════════════════════════════════════════
//  Firebase 設定
//
//  セットアップ手順:
//  1. https://console.firebase.google.com にアクセス
//  2. 「プロジェクトを作成」→ 名前は wedding など
//  3. 「Realtime Database」を有効化（テストモードでOK）
//  4. 「Storage」を有効化
//  5. 「プロジェクトの設定」→「マイアプリ」→ </> でウェブアプリ追加
//  6. 表示された設定を下にコピペ
// ════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ────────────────────────────────────────────────
//  設定済みなら Firebase、未設定なら localStorage で動作
// ────────────────────────────────────────────────
if (FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
  initFirebase(FIREBASE_CONFIG);
} else {
  initLocalFallback();
}
