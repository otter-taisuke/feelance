"use client";

import { useEffect, useMemo } from "react";

import { HappyChan } from "./HappyChan";

type HappyChanVariant = "sobad" | "sad" | "standard" | "happy" | "excited";

type HappyChanOverlayProps = {
  show: boolean;
  moodScore: number;
  durationMs?: number;
  onClose?: () => void;
};

const getHappyChanVariant = (moodScore: number): HappyChanVariant => {
  if (moodScore <= -2) return "sobad";
  if (moodScore === -1) return "sad";
  if (moodScore === 0) return "standard";
  if (moodScore === 1) return "happy";
  return "excited";
};

const getMessage = (moodScore: number): string => {
  const messages: Record<number, string[]> = {
    [-2]: [
      "辛かったね。でもいつかきっと、笑える日が来るよ。",
      "大丈夫。どんな日も必ず終わりが来る。",
      "今は辛いかもしれないけど、君は一人じゃない。",
      "涙の後には、きっと笑顔が待っている。",
      "この経験が、きっと君を強くしてくれる。",
      "君という花の花言葉は、「悲しみに暮れた冬」だね。",
      "何のために僕がいるんだい？君の涙を拭くためさ。",
      "崖の下が暗いのは、光を上に登る目印にするためさ。",
      "シェイクスピアが君を見ていたら、きっと名作を生み出すだろう。",
      "君が流した涙で、君の名前のバラ園を造ろう。",
      "なんで下を見るの？僕は空を飛んでいるよ？",
      "君が笑えるようになったら、サグラダファミリアが完成するよ。",
      "君を救う請願書を政府に提出するよ。",
    ],
    [-1]: [
      "残念。明日は良いことがあるよ。",
      "今日はちょっと残念だったね。でも明日は違う。",
      "大丈夫。悪い日もあるさ。",
      "少し落ち込む日もあるよね。無理しなくていいよ。",
      "今日はそういう日だったんだね。明日はきっと良い日になる。",
      "胸に悲しみを抱くヒロインの方が美しいと思うよ。",
      "笑い話をゲットしたね。良かったじゃないか。",
      "少しの不幸は、君が頑張ってる証拠。",
      "神は乗り越えられる試練しか与えないよ。",
      "でも、大丈夫。明日がすぐ始まるよ。",
    ],
    [0]: [
      "普通であることの幸せを噛みしめて。",
      "普通の日も、実はとても大切な日なんだ。",
      "平穏な日々は、最高の贈り物だよ。",
      "普通って、実は特別なことなんだよね。",
      "今日も無事に過ごせて、それだけで素晴らしい。",
      "今日みたいな日のことを「幸せ」って呼ぼうよ。",
      "大事にしないと、「今日」は逃げるよ。",
      "世界の何人が幸せだと思う？君も含めるよ。",
      "日常って当たり前だけど、とても大事な当たり前だよ。",
      "最期の日に思い出すのは、今日のことだったりするかもね。",
    ],
    [1]: [
      "良かったね。君が幸せなら僕も幸せさ。",
      "嬉しい！君の笑顔が見られて良かった。",
      "良い日だったね。その気持ちを大切にして。",
      "素敵な一日だったね。君の幸せが伝わってくるよ。",
      "良かった！小さな幸せも、大きな幸せだよ。",
      "小さな幸せを教えてくれてありがとう。",
      "人は笑うために生きているんだって。",
      "君は世界に一つだけの花だよ。",
      "君の笑顔は、僕の心を癒す魔法さ。",
      "ねえ、君は今、僕の幸せさ。",
    ],
    [2]: [
      "気分はどうだい？世界はもう、君のためにあるようなものさ！",
      "最高だね！君の笑顔が世界を照らしてるよ！",
      "素晴らしい！今日は特別な日だね！",
      "最高の気分だね！そのエネルギーが伝わってくるよ！",
      "完璧だ！君は今日、世界で一番輝いてるよ！",
      "気づいてる？君の笑顔は世界一だってことに。",
      "君が幸せなら、太陽だって笑いだすさ。",
      "君のために架かった虹は、8色あるよ。七色と君の色。",
      "今日みたいな日が1日あれば、10年は楽しく過ごせるね。",
      "月から見えるのは万里の長城だけじゃない。君の輝きも、さ。",
      "10年後に思い出すために、今の空の色を覚えておいて。",
      "あなたは今日をもって、第23代ハッピー王国の国王だよ。",
      "君がいいねと言ったから、今日という日は、君記念日、だよ。",
      "ビッグバンから今日までの日は、君のための物語さ。",
      "君にキスをされた地球が恥ずかしがって、温暖化しているんだよ。",
      "君の声を聴かせた桜は、秋まで咲いていたらしいよ。",
      "君の主演の大河ドラマが決定したよ。今。",
    ],
  };

  const scoreKey = moodScore <= -2 ? -2 : moodScore >= 2 ? 2 : moodScore;
  const messageList = messages[scoreKey] || messages[0];
  const randomIndex = Math.floor(Math.random() * messageList.length);
  return messageList[randomIndex];
};

export function HappyChanOverlay({ show, moodScore, durationMs = 3000, onClose }: HappyChanOverlayProps) {
  const variant = useMemo(() => getHappyChanVariant(moodScore), [moodScore]);
  const message = useMemo(() => getMessage(moodScore), [moodScore, show]);

  useEffect(() => {
    if (!show || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [show, durationMs, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-fade-in">
        <div className="flex flex-col items-center gap-3 bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200 max-w-md">
          <HappyChan size="large" variant={variant} />
          <p className="text-lg font-bold text-blue-600 text-center">{message}</p>
        </div>
      </div>
    </div>
  );
}

