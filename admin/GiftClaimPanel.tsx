import {useEffect,useState} from 'react';
import {Gift,RefreshCw} from 'lucide-react';
import './gift-admin.css';

type Claim={nickname:string;receipt:string;claimed_at:string};
export default function GiftClaimPanel(){
  const [claim,setClaim]=useState<Claim|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const load=async()=>{
    setBusy(true);setError('');
    try{
      const response=await fetch('/admin-api/gift',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'无法读取领取记录');
      setClaim(data.claim);
    }catch(reason){setError(reason instanceof Error?reason.message:'无法读取领取记录');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void load()},[]);
  return <section className="admin-gift-panel"><header><div><Gift size={20}/><h2>奶茶礼包核对</h2></div><button disabled={busy} onClick={()=>void load()}><RefreshCw size={15}/>{busy?'读取中…':'刷新领取记录'}</button></header>
    {error?<p role="alert">{error}</p>:claim?<dl><div><dt>领取昵称</dt><dd>{claim.nickname}</dd></div><div><dt>兑换凭证</dt><dd><code>{claim.receipt}</code></dd></div><div><dt>领取时间（UTC）</dt><dd>{claim.claimed_at}</dd></div></dl>:<p>{busy?'正在查询…':'礼包尚未被领取。'}</p>}
    <small>核对昵称与凭证后即可兑换。此处只查询记录，刷新不会重置礼包。</small>
  </section>;
}
