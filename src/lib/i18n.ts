export type Locale = "en" | "ja";

export type PrivacySection = { heading: string; body: readonly string[] };

export const LOCALES: readonly Locale[] = ["en", "ja"];

const en = {
  brand: "Find Me Penguin",
  brandJa: "ペンギン探そう",
  language: "Language",

  headline: "Show us the flock.",
  headlineSub: "Real, cartoon, or tux-and-snow lookalikes. We count them all.",
  dropTitle: "Drop a photo here",
  dropFormats: "JPG, PNG or HEIC",
  takePhoto: "Take a photo",
  chooseLibrary: "Choose from library",
  tip: "Tip: more light, fewer hats.",
  privacy: "Your photo is sent to an AI service to count the penguins. We don't keep it.",
  privacyLink: "Privacy details",
  privacyTitle: "Privacy",
  privacyBack: "Back to the app",
  privacyIntro: "A hobby project. This page describes how the app works today.",
  privacySections: [
    {
      heading: "Your photo",
      body: [
        "Your photo is shrunk on your device first. That also removes any location data hidden in it. It is then sent once to an AI service (Anthropic) that finds the penguins.",
        "We don't save it. Nothing is kept after the answer comes back. How Anthropic handles data sent to its API is covered by Anthropic's own terms and privacy policy.",
      ],
    },
    {
      heading: "What we keep",
      body: [
        "No accounts, no cookies and no stored photos.",
        "To stop abuse we keep a short-lived counter tied to a one-way scramble (hash) of your IP address. It expires within about a day. We also keep one monthly total of how many photos were counted, to stay within our budget.",
        "For understanding how the app is doing we keep anonymous daily totals: how many counts worked, in broad size groups (none, 1, 2 to 5, 6 to 20, more than 20), and how many failed on our side. No photos, no IP addresses and nothing that identifies you.",
      ],
    },
    {
      heading: "Our host",
      body: ["The site runs on Vercel, which may keep standard server logs (such as IP address and time) as part of running the service."],
    },
    {
      heading: "On your device",
      body: ["Your language choice is saved in your browser. Nothing else is stored there. Share cards are made on your device and only leave it if you share or save them."],
    },
  ] as readonly PrivacySection[],
  preparing: "Getting your photo ready…",

  counting: "Counting…",
  cancel: "Cancel",
  countInBackground: "Count in background",
  countingHint: "Takes a moment. You can browse while we count.",
  progress1: "Interrogating suspicious black-and-white shapes…",
  progress2: "Checking behind the icebergs…",
  progress3: "Counting flippers…",
  progress4: "Asking the snowman for an alibi…",

  bgCounting: "Counting in the background…",
  bgDone: "Done! View result",
  bgFailed: "Couldn't count. See why",

  resultTitle: "Result",
  close: "Close",
  crowdHeadline: "Whoa, that's a lot!",
  crowdSub: "Too many penguins to count exactly. Try a closer shot of a smaller group.",
  zeroHeadline: "No penguins. Suspicious.",
  zeroSub: "We checked the shapes, the shadows and everything else.",
  tryThis: "Try this",
  tip1: "Get closer so the whole body is in frame",
  tip2: "Avoid backlight: silhouettes confuse us",
  tip3: "Cartoon or toy penguins count too",
  tryAnother: "Try another photo",
  again: "Again",

  errTitle: "Oops, penguin trouble",
  err_unsupported: "We can't read that file. Try a JPG, PNG or HEIC photo.",
  err_empty: "That file looks empty. Try another photo.",
  err_too_large: "That photo is too big to prepare. Try a smaller one.",
  err_bad_image: "We couldn't use that photo. Try another one.",
  err_rate_limited: "Easy there! That's a lot of photos. Try again in a minute.",
  err_budget_exceeded: "The penguin counters are resting for now. Please come back later.",
  err_model_error: "Something went wrong on our side. Please wait while we fix it, then try again.",
  err_network: "Can't reach the server. Check your connection and try again.",

  found: (n: number): string => (n === 1 ? "penguin found!" : "penguins found!"),
  foundSr: (n: number): string => `${n} ${n === 1 ? "penguin" : "penguins"} found`,
  photoAltCount: (n: number): string => `Your photo with ${n} ${n === 1 ? "penguin" : "penguins"} marked with an X`,
  photoAltCrowd: "Your photo with more than 20 penguins",
  photoAltZero: "Your photo, with no penguins found",
  photoAltCounting: "Your photo being scanned",

  share: "Share",
  save: "Save",
  cardsHeading: "Share card",
  styleDark: "Dark",
  styleSnow: "Snow",
  styleZap: "Zap",
  cardError: "Couldn't make the card. Please try again.",
  cardUnit: (n: number): string => (n === 1 ? "penguin" : "penguins"),
  cardFound: "found",
  cardSnowTitle: "Penguins",
  cardSnowFound: "found!",
  cardSnowSuffix: "",
  cardZap1: "Penguins.",
  cardZap2: "Counted.",
};

export type Messages = { [K in keyof typeof en]: (typeof en)[K] };

const ja: Messages = {
  brand: "Find Me Penguin",
  brandJa: "ペンギン探そう",
  language: "言語",

  headline: "群れを見せて。",
  headlineSub: "本物でもイラストでも、ペンギンっぽければ全部数えます。",
  dropTitle: "ここに写真をドロップ",
  dropFormats: "JPG・PNG・HEIC対応",
  takePhoto: "写真を撮る",
  chooseLibrary: "ライブラリから選ぶ",
  tip: "ヒント：明るい場所で、帽子は少なめに。",
  privacy: "写真はペンギンを数えるためにAIサービスへ送信されます。当サイトでは保存しません。",
  privacyLink: "プライバシーについて",
  privacyTitle: "プライバシー",
  privacyBack: "アプリに戻る",
  privacyIntro: "趣味で作っているアプリです。このページでは、現在の仕組みを説明します。",
  privacySections: [
    {
      heading: "あなたの写真",
      body: [
        "写真はまずお使いの端末で縮小されます。このとき、写真に含まれる位置情報も取り除かれます。その後、ペンギンを見つけるAIサービス（Anthropic）に一度だけ送信されます。",
        "写真は保存しません。結果が返ってきた後は何も残りません。Anthropicが送信データをどう扱うかは、Anthropic自身の利用規約とプライバシーポリシーに従います。",
      ],
    },
    {
      heading: "保存する情報",
      body: [
        "アカウントもCookieもなく、写真も保存しません。",
        "不正利用を防ぐため、IPアドレスを一方向に変換（ハッシュ化）した値に結びついた短期間のカウンターを保持します。約1日で消えます。また、予算内に収めるため、数えた写真の月間合計を1つだけ保持します。",
        "アプリの状況を把握するため、匿名の日別集計を保持します。成功した件数（0羽、1羽、2〜5羽、6〜20羽、20羽より多い、の大まかなグループ別）と、こちら側で失敗した件数です。写真もIPアドレスも、あなたを特定できる情報も含まれません。",
      ],
    },
    {
      heading: "ホスティング",
      body: ["このサイトはVercel上で動いており、サービス運営の一環として、IPアドレスや時刻などの標準的なサーバーログが保持される場合があります。"],
    },
    {
      heading: "お使いの端末",
      body: ["言語の選択はブラウザに保存されます。それ以外は保存されません。シェアカードは端末上で作られ、シェアまたは保存したときだけ端末の外に出ます。"],
    },
  ] as readonly PrivacySection[],
  preparing: "写真を準備中…",

  counting: "数えています…",
  cancel: "キャンセル",
  countInBackground: "バックグラウンドで数える",
  countingHint: "少し時間がかかります。数えている間も操作できます。",
  progress1: "白黒の怪しい影を調べています…",
  progress2: "氷山の裏をチェック中…",
  progress3: "フリッパーを数えています…",
  progress4: "雪だるまにアリバイを確認中…",

  bgCounting: "バックグラウンドで数えています…",
  bgDone: "完了！結果を見る",
  bgFailed: "数えられませんでした。理由を見る",

  resultTitle: "結果",
  close: "閉じる",
  crowdHeadline: "うわ、たくさん！",
  crowdSub: "多すぎて正確には数えられません。少なめの群れに近づいて撮ってみてください。",
  zeroHeadline: "ペンギンがいません。怪しい…",
  zeroSub: "形も影も、隅々まで調べました。",
  tryThis: "こうしてみて",
  tip1: "全身が写るように近づいてみてください",
  tip2: "逆光は避けて。シルエットだと分かりにくいです",
  tip3: "イラストやおもちゃのペンギンもOKです",
  tryAnother: "別の写真を試す",
  again: "もう一度",

  errTitle: "おっと、ペンギンのトラブル",
  err_unsupported: "このファイルは読み込めません。JPG、PNG、HEICの写真をお試しください。",
  err_empty: "ファイルが空のようです。別の写真をお試しください。",
  err_too_large: "写真が大きすぎて準備できません。小さいものをお試しください。",
  err_bad_image: "この写真は使えませんでした。別の写真をお試しください。",
  err_rate_limited: "ちょっと待って！写真が多すぎます。1分後にもう一度お試しください。",
  err_budget_exceeded: "ペンギンカウンターはいまお休み中です。後でまたお越しください。",
  err_model_error: "こちら側でペンギン的なトラブルが起きました。直るまで少しお待ちください。",
  err_network: "サーバーに接続できません。通信状況を確認して、もう一度お試しください。",

  found: (): string => "羽 みつけた！",
  foundSr: (n: number): string => `${n}羽 みつけた`,
  photoAltCount: (n: number): string => `ペンギン${n}羽にXを付けたあなたの写真`,
  photoAltCrowd: "ペンギンが20羽より多く写っているあなたの写真",
  photoAltZero: "ペンギンが見つからなかったあなたの写真",
  photoAltCounting: "スキャン中のあなたの写真",

  share: "シェア",
  save: "保存",
  cardsHeading: "シェアカード",
  styleDark: "ダーク",
  styleSnow: "ゆき",
  styleZap: "ビリビリ",
  cardError: "カードを作れませんでした。もう一度お試しください。",
  cardUnit: (): string => "羽",
  cardFound: "みつけた！",
  cardSnowTitle: "ペンギン",
  cardSnowFound: "みつけた！",
  cardSnowSuffix: "羽",
  cardZap1: "ペンギン、",
  cardZap2: "数えた。",
};

export const messages: Record<Locale, Messages> = { en, ja };

/** Pick a locale from the browser's language list; Japanese if it comes first. */
export function detectLocale(languages: readonly string[] | undefined): Locale {
  const first = languages?.[0]?.toLowerCase() ?? "";
  return first.startsWith("ja") ? "ja" : "en";
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ja";
}

export type ErrorKey =
  | "unsupported"
  | "empty"
  | "too_large"
  | "bad_image"
  | "rate_limited"
  | "budget_exceeded"
  | "model_error"
  | "network";

export function errorMessage(m: Messages, key: ErrorKey): string {
  return m[`err_${key}` as const];
}
