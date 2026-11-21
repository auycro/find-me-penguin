export type Locale = "en" | "ja";

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
  err_model_error: "こちら側で問題が起きました。修正までしばらくお待ちいただき、後でもう一度お試しください。",
  err_network: "サーバーに接続できません。通信状況を確認して、もう一度お試しください。",

  found: (): string => "羽 みつけた！",
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
