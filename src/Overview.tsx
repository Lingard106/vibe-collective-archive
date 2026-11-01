import {useEffect, useState} from 'react';
import {Camera} from 'lucide-react';
import {metDate, photos} from './data';
import CrossfadeImage from './media/CrossfadeImage';
import {prepareImage} from './media/image-loader';
import {useMediaPreference, usePageVisible} from './media/useMediaPreference';
import CharacterUpdateNotice from './CharacterUpdateNotice';
import {useMelonBirthday} from './birthday/useMelonBirthday';
import './birthday/melon-birthday.css';

const backgrounds = ['/media/overview-bg.webp', ...photos];
export default function Overview() {
  const mobile = useMediaPreference('(max-width:650px)');
  const reduced = useMediaPreference('(prefers-reduced-motion: reduce)');
  const pageVisible = usePageVisible();
  const melonBirthday = useMelonBirthday();
  const birthdaySource = mobile ? '/media/melon-birthday-mobile-2026.webp' : '/media/melon-birthday-home-2026.webp';
  const [requested, setRequested] = useState(0);
  const [displayed, setDisplayed] = useState(0);
  const [source, setSource] = useState(() => melonBirthday ? birthdaySource : mobile ? '/media/overview-mobile.webp' : backgrounds[0]);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [ready, setReady] = useState(false);
  const getMinutes = () => Math.floor((Date.now() - new Date(metDate).getTime()) / 60000);
  const [minutes, setMinutes] = useState(getMinutes);
  const requestedSource = melonBirthday ? birthdaySource : mobile && requested === 0 ? '/media/overview-mobile.webp' : backgrounds[requested];
  useEffect(() => {if (melonBirthday) setPicker(false);}, [melonBirthday]);
  useEffect(() => {
    let valid = true;
    setReady(false);
    setError('');
    void prepareImage(requestedSource).then(() => {
      if (!valid) return;
      setSource(requestedSource);
      setDisplayed(requested);
      setReady(true);
    }).catch(reason => {if (valid) setError(reason instanceof Error ? reason.message : '图片暂时未能加载');});
    return () => {valid = false;};
  }, [requestedSource, requested, retry]);
  useEffect(() => {
    if (!pageVisible || reduced || picker || !ready || melonBirthday) return;
    const timer = setTimeout(() => setRequested((displayed + 1) % backgrounds.length), 7000);
    return () => clearTimeout(timer);
  }, [displayed, pageVisible, reduced, picker, ready, melonBirthday]);
  useEffect(() => {
    if (!pageVisible) return;
    const timer = setInterval(() => setMinutes(getMinutes()), 10000);
    return () => clearInterval(timer);
  }, [pageVisible]);
  useEffect(() => {
    if (!ready || !pageVisible || reduced || melonBirthday) return;
    const next = (displayed + 1) % backgrounds.length;
    const timer = setTimeout(() => {void prepareImage(mobile && next === 0 ? '/media/overview-mobile.webp' : backgrounds[next]).catch(() => {});}, 1200);
    return () => clearTimeout(timer);
  }, [displayed, mobile, pageVisible, reduced, ready, melonBirthday]);
  return <section className={`page overview${melonBirthday ? ' melon-birthday-home' : ''}`}>
    {!melonBirthday && <CharacterUpdateNotice/>}
    <div className="hero-bg"><CrossfadeImage src={source}/></div><div className="hero-shade"/>
    <div className="overview-mark"><span>C106</span><small>COLLECTIVE ARCHIVE</small></div>
    <div className="minute-counter"><p>{melonBirthday ? '11.02 · 今天的主角是你' : '从 2021.09.01 开始，我们已经相识'}</p><strong>{melonBirthday ? '西瓜，生日快乐' : minutes.toLocaleString()}</strong><div><i/>{melonBirthday ? '十个人，为你留下一天的欢喜' : ' MINUTES TOGETHER '}<i/></div></div>
    <div className="overview-foot"><span>{melonBirthday ? '十个人围在一起 · 西瓜，生日快乐' : '十个人 · 一段仍在继续的故事'}</span><em>{melonBirthday ? 'NOV. 02 · 2026' : 'EST. 2021'}</em></div>
    {error && <div className="image-retry" role="status">{error}<button onClick={() => setRetry(value => value + 1)}>重新加载</button></div>}
    {!melonBirthday && <div className="bg-picker"><button aria-label="选择背景照片" aria-expanded={picker} onClick={() => setPicker(!picker)}><Camera size={15}/></button>
      {picker && <div className="bg-thumbs">{backgrounds.map((photo, index) => <button key={photo} aria-label={`选择第 ${index + 1} 张背景`} aria-pressed={displayed === index} className={displayed === index ? 'active' : ''} onClick={() => {setRequested(index); setRetry(value => value + 1); setPicker(false);}}><img src={photo} alt="" loading="lazy" decoding="async"/></button>)}</div>}
    </div>}
  </section>;
}
