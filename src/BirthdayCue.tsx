import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music2 } from 'lucide-react';
import { members, type MemberProfile } from './data';
import './birthday.css';

/**
 * C106 生日特效
 * 纯前端按日期触发：只有当天（北京时间）进入网站的人才会看到，次日自动消失，无需手动上下线。
 * 新增生日只需往 BIRTHDAYS 里加一行：'MM-DD': '成员id'。
 */
const BIRTHDAYS: Record<string, string> = {
  '10-14': 'judefan', // 槽阻 / JudeFan / 曹祖
};

const SESSION_KEY = 'c106-bday-fx';

function toWebp(src: string) {
  return src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
}

/** 返回北京的月-日，例如 "10-14"，避免访客本地时区把日期算偏。 */
function todayMonthDay(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const m = parts.find((p) => p.type === 'month')?.value ?? '00';
    const d = parts.find((p) => p.type === 'day')?.value ?? '00';
    return `${m}-${d}`;
  } catch {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

/** 支持 URL 预览：?bday=1014 或 ?bday=1 强制预览任意/第一位寿星（线上同样可用，方便预演）。 */
const FORCED_PREVIEW =
  typeof window !== 'undefined' && /[?&]bday=/.test(window.location.search);
/** ?fx=off 只显示常驻角标、不弹全屏层，方便预览常驻部分。 */
const FX_OFF =
  typeof window !== 'undefined' && /[?&]fx=off/.test(window.location.search);

function resolveBirthdayId(): string | null {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('bday');
    if (q) {
      if (q === '1' || q === 'true') return Object.values(BIRTHDAYS)[0] ?? null;
      const digits = q.replace(/\D/g, '');
      const key = digits.length === 4 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : q;
      return BIRTHDAYS[key] ?? Object.values(BIRTHDAYS)[0] ?? null;
    }
  }
  return BIRTHDAYS[todayMonthDay()] ?? null;
}

export function useBirthdayMember(): MemberProfile | null {
  const [member, setMember] = useState<MemberProfile | null>(null);
  useEffect(() => {
    const id = resolveBirthdayId();
    if (id) setMember(members.find((m) => m.id === id) ?? null);
  }, []);
  return member;
}

/** 常驻角标：挂在导航 logo 上的小蛋糕。 */
export function BirthdayBadge() {
  const member = useBirthdayMember();
  if (!member) return null;
  return (
    <span className="bday-badge" role="img" aria-label="今日寿星" title={`今天是${member.nickname}的生日`}>
      🎂
    </span>
  );
}

/** 常驻顶部横条。 */
export function BirthdayStrip() {
  const member = useBirthdayMember();
  if (!member) return null;
  return (
    <div className="bday-strip" role="status">
      <span aria-hidden>🎂</span>
      <span>
        今天是我们 <em>{member.nickname}</em> 的生日
      </span>
      <i aria-hidden />
      <span>{member.quote}</span>
    </div>
  );
}

const COLORS = ['#e5c78f', '#c9ff55', '#f6f1e7', '#d9b26a'];
const CONFETTI = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 13.7 + 3) % 100,
  delay: (i % 8) * 0.4,
  dur: 3.4 + (i % 5) * 0.55,
  color: COLORS[i % COLORS.length],
  w: i % 4 === 0 ? 7 : 9,
  h: i % 3 === 0 ? 12 : 16,
}));

// 蛋糕雨：大量 🎂 从顶部飘落，front 的走前景层、做得更大颗。
const CAKES = Array.from({ length: 36 }, (_, i) => {
  const front = i % 5 === 0;
  return {
    left: (i * 37 + 4) % 100,
    size: Math.round((20 + ((i * 7) % 5) * 9) * (front ? 1.5 : 1)),
    delay: ((i * 13) % 9) * 0.32,
    dur: 3.2 + ((i * 5) % 6) * 0.55,
    sway: (i % 2 ? 1 : -1) * (8 + ((i * 3) % 5) * 6),
    rot: (i % 2 ? 1 : -1) * (160 + ((i * 11) % 4) * 110),
    front,
  };
});

function cakeStyle(c: (typeof CAKES)[number]): CSSProperties {
  return {
    left: `${c.left}%`,
    fontSize: c.size,
    animationDelay: `${c.delay}s`,
    animationDuration: `${c.dur}s`,
    '--sway': `${c.sway}px`,
    '--rot': `${c.rot}deg`,
  } as unknown as CSSProperties;
}

// 土味礼花：满屏 emoji 从底部往上冒。
const PARTY = ['🎉', '🎊', '🎈', '🥳', '🧧', '💰', '🌟', '💥', '🎁', '🍰'];
const TQ_EMOJIS = Array.from({ length: 30 }, (_, i) => ({
  ch: PARTY[i % PARTY.length],
  left: (i * 17 + 6) % 100,
  size: 26 + ((i * 5) % 4) * 12,
  delay: ((i * 7) % 8) * 0.4,
  dur: 2.6 + ((i * 3) % 5) * 0.5,
  drift: (i % 2 ? 1 : -1) * (10 + ((i * 9) % 4) * 8),
}));

function tqStyle(e: (typeof TQ_EMOJIS)[number]): CSSProperties {
  return {
    left: `${e.left}%`,
    fontSize: e.size,
    animationDelay: `${e.delay}s`,
    animationDuration: `${e.dur}s`,
    '--drift': `${e.drift}px`,
  } as unknown as CSSProperties;
}

/** 全屏庆祝层：当天进入网站播放一次。 */
export default function BirthdayFx() {
  const member = useBirthdayMember();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!member || FX_OFF) return;
    const key = todayMonthDay();
    if (!FORCED_PREVIEW) {
      if (sessionStorage.getItem(SESSION_KEY) === key) return; // 同一次会话只放一次
      sessionStorage.setItem(SESSION_KEY, key);
    }
    setOpen(true);
    const timer = window.setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setBlocked(true)); // 浏览器拦截自动播放
    }, 700);
    return () => window.clearTimeout(timer);
  }, [member]);

  const close = () => {
    audioRef.current?.pause();
    setPlaying(false);
    setOpen(false);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play()
        .then(() => {
          setPlaying(true);
          setBlocked(false);
        })
        .catch(() => setBlocked(true));
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  if (!member) return null;
  const avatar = toWebp(member.avatar);

  return (
    <>
      <audio ref={audioRef} src="/media/birthday.mp3" loop preload="none" />
      <AnimatePresence>
        {open && (
          <motion.div
            className="bday-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            onClick={close}
          >
            <div className="tq-rays" aria-hidden />
            <div className="tq-marquee tq-marquee-top" aria-hidden>
              <span>🎉🥳 恭祝 槽阻 生日快乐 🎂 越来越帅 💪 天天开心 😆 暴富暴富 💰 永远十八岁 惊艳无比 🧧🎉🥳 恭祝 槽阻 生日快乐 🎂</span>
            </div>
            <div className="tq-title" aria-hidden>
              生日快乐
            </div>
            <div className="bday-bigcakes" aria-hidden>
              <span className="bc1">🎂</span>
              <span className="bc2">🎂</span>
              <span className="bc3">🎂</span>
              <span className="bc4">🎂</span>
            </div>
            <div className="tq-emojis" aria-hidden>
              {TQ_EMOJIS.map((e, i) => (
                <span key={i} style={tqStyle(e)}>
                  {e.ch}
                </span>
              ))}
            </div>
            <div className="bday-cakerain" aria-hidden>
              {CAKES.filter((c) => !c.front).map((c, i) => (
                <span key={i} style={cakeStyle(c)}>
                  🎂
                </span>
              ))}
            </div>
            <div className="bday-cakerain front" aria-hidden>
              {CAKES.filter((c) => c.front).map((c, i) => (
                <span key={i} style={cakeStyle(c)}>
                  🎂
                </span>
              ))}
            </div>
            <div className="bday-confetti" aria-hidden>
              {CONFETTI.map((c, i) => (
                <span
                  key={i}
                  style={{
                    left: `${c.left}%`,
                    width: c.w,
                    height: c.h,
                    background: c.color,
                    animationDelay: `${c.delay}s`,
                    animationDuration: `${c.dur}s`,
                  }}
                />
              ))}
            </div>
            <motion.div
              className="bday-card tacky"
              initial={{ scale: 0.86, y: 26, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="bday-kicker">HAPPY BIRTHDAY</span>
              <div className="bday-avatar">
                <img src={avatar} alt={member.nickname} />
              </div>
              <h2>{member.nickname}</h2>
              <p className="bday-en">{member.englishName.toUpperCase()}</p>
              <p className="bday-wish">生日快乐，愿你接下来的每一天都足够惊艳。</p>
              <span className="bday-quote">「{member.quote}」</span>
              <div>
                <button type="button" className="bday-music" onClick={togglePlay}>
                  <Music2 size={15} /> {playing ? '生日歌播放中…' : blocked ? '点我听生日歌' : '播放生日歌'}
                </button>
              </div>
            </motion.div>
            <div className="tq-marquee tq-marquee-bottom" aria-hidden>
              <span>🎂 生日快乐 越来越帅 天天开心 暴富暴富 永远十八岁 惊艳无比 🎂</span>
            </div>
            <button type="button" className="bday-close" onClick={close}>
              进入网站
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
