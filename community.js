(() => {
 const c=window.squadUpSupabase;if(!c)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 let initialized=false;
 let me='',friends=[],players=new Map(),blocked=new Set(),typing=new Map(),channel,beatTimer,pollTimer;
 const button=document.createElement('button');button.type='button';button.textContent='Friends & squads';button.className='community-launch';
 const panel=document.createElement('dialog');panel.className='community-panel';panel.innerHTML='<header><h2>Friends & squads</h2><button type="button" data-close>Close</button></header><p role="status" id="community-status"></p><button type="button" data-invite>Copy invite link</button><h3>Find a teammate</h3><input id="community-search" placeholder="Search gamer tag" aria-label="Search gamer tag"><div id="community-players"></div><h3>Friend requests & friends</h3><div id="community-friends"></div><h3>Your squad group chats</h3><div id="community-squads"></div><h3>Blocked players</h3><div id="community-blocked"></div><p>Reports go to the site owner for review.</p>';
 document.body.append(button,panel);button.hidden=true;
 const status=t=>panel.querySelector('#community-status').textContent=t;
 button.onclick=()=>{panel.showModal();refresh().catch(e=>status(e.message));};panel.querySelector('[data-close]').onclick=()=>panel.close();
 const row=(name,html)=>`<div class="community-row"><span>${esc(name)}</span><span>${html}</span></div>`;
 const action=(peer,act,label)=>`<button type="button" data-peer="${esc(peer)}" data-action="${act}">${label}</button>`;
 function paint(){
 const q=panel.querySelector('#community-search').value.trim().toLowerCase();
 panel.querySelector('#community-players').innerHTML=[...players.values()].filter(p=>p.id!==me&&!blocked.has(p.id)&&(!q||p.gamer_tag.toLowerCase().includes(q))).slice(0,30).map(p=>row(p.gamer_tag+(online(p.last_seen)?' · Online':''),action(p.id,'request','Add friend')+` <a href="messages.html?to=${encodeURIComponent(p.id)}">Chat</a>`)).join('')||'No players found.';
 panel.querySelector('#community-friends').innerHTML=friends.filter(f=>!blocked.has(f.sender_id===me?f.recipient_id:f.sender_id)).map(f=>{const id=f.sender_id===me?f.recipient_id:f.sender_id;return row((players.get(id)?.gamer_tag||'Player')+' · '+(f.status==='accepted'?'Friends':f.recipient_id===me?'Incoming request':'Request sent'),(f.status==='pending'&&f.recipient_id===me?action(id,'accept','Accept'):'')+action(id,'remove',f.status==='accepted'?'Unfriend':'Dismiss')+` <a href="messages.html?to=${encodeURIComponent(id)}">Chat</a>`);}).join('')||'No friend requests yet.';
 panel.querySelector('#community-blocked').innerHTML=[...blocked].map(id=>row(players.get(id)?.gamer_tag||'Player',action(id,'unblock','Unblock'))).join('')||'No blocked players.';
 button.textContent='Friends & squads'+(friends.some(f=>f.recipient_id===me&&f.status==='pending')?' •':'');
 window.dispatchEvent(new Event('squadup:social-updated'));
 }
 function online(t){return !!t&&Date.now()-Date.parse(t)<75000;}
 async function refresh(){
 if(!me)return;
 const results=await Promise.all([c.from('profiles').select('id,gamer_tag,last_seen,game_ids').limit(500),c.from('squad_friendships').select('*'),c.from('squad_user_blocks').select('blocked_user_id').eq('user_id',me)]);
 for(const x of results)if(x.error)throw x.error;
 initialized=true;
 players=new Map(results[0].data.map(p=>[p.id,p]));friends=results[1].data;blocked=new Set(results[2].data.map(b=>b.blocked_user_id));paint();
 }
 async function squads(){
 const [mine,members]=await Promise.all([c.from('squad_requests').select('id,data').eq('owner_id',me),c.from('squad_members').select('request_id').eq('user_id',me)]);
 if(mine.error||members.error)throw mine.error||members.error;
 let list=mine.data||[],ids=(members.data||[]).map(m=>m.request_id);
 if(ids.length){const {data,error}=await c.from('squad_requests').select('id,data').in('id',ids);if(error)throw error;list.push(...data);}
 list=[...new Map(list.map(p=>[p.id,p])).values()];
 panel.querySelector('#community-squads').innerHTML=list.map(p=>row(p.data.g||'Squad',`<a href="index.html?squad=${encodeURIComponent(p.id)}#play">Open group chat</a>`)).join('')||'Join or host a squad to open its group chat.';
 }
 async function heartbeat(){if(me&&!document.hidden){const {error}=await c.rpc('squad_heartbeat');if(error)status(error.message);}}
 panel.querySelector('#community-search').oninput=paint;
 panel.querySelector('[data-invite]').onclick=async()=>{const url=new URL('signup.html',location.href).href;try{await navigator.clipboard.writeText(url);status('Invite link copied. Share it with your friends.');}catch{status('Share this invite link: '+url);}};
 panel.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;b.disabled=true;
 try{const peer=b.dataset.peer;const result=b.dataset.action==='unblock'?await c.from('squad_user_blocks').delete().eq('user_id',me).eq('blocked_user_id',peer):await c.rpc('squad_friend_action',{peer,action:b.dataset.action});if(result.error)throw result.error;await refresh();status('Updated.');}catch(error){status(error.message);}finally{b.disabled=false;}
 });
 window.SquadCommunity={ready:()=>initialized,refresh,
 friendState:id=>{const edge=friends.find(f=>(f.sender_id===me&&f.recipient_id===id)||(f.sender_id===id&&f.recipient_id===me));return !edge?'none':edge.status==='accepted'?'accepted':edge.recipient_id===me?'incoming':'pending';},
 async unblock(peer){const {error}=await c.from('squad_user_blocks').delete().eq('user_id',me).eq('blocked_user_id',peer);if(error)throw error;await refresh();},
 online:id=>online(players.get(id)?.last_seen),profile:id=>players.get(id),blocked:id=>blocked.has(id),typing:id=>(typing.get(id)||0)>Date.now(),
 async block(peer){const {error}=await c.from('squad_user_blocks').insert({user_id:me,blocked_user_id:peer});if(error&&error.code!=='23505')throw error;const result=await c.rpc('squad_friend_action',{peer,action:'remove'});await refresh();if(result.error)throw result.error;},
 async report(peer,reason){const {error}=await c.from('squad_chat_reports').insert({reporter_id:me,reported_user_id:peer,reason});if(error)throw error;},
 async type(peer,active){if(!peer||!me)return;const {error}=await c.rpc('squad_set_typing',{peer,active});if(error)console.debug('Typing unavailable');}
 };
 async function start(){const {data,error}=await c.auth.getSession();if(error||!data.session)return;me=data.session.user.id;button.hidden=false;
 try{await Promise.all([refresh(),squads(),heartbeat()]);}catch(e){status('Run community-setup.sql in Supabase: '+e.message);}
 channel=c.channel('social-'+me).on('postgres_changes',{event:'*',schema:'public',table:'squad_friendships'},()=>refresh().catch(e=>status(e.message))).on('postgres_changes',{event:'*',schema:'public',table:'squad_typing',filter:'recipient_id=eq.'+me},p=>{if(p.new?.sender_id){typing.set(p.new.sender_id,Date.parse(p.new.expires_at));window.dispatchEvent(new Event('squadup:social-updated'));}}).subscribe();
 beatTimer=setInterval(heartbeat,30000);pollTimer=setInterval(()=>{if(!document.hidden)refresh().catch(()=>{});},30000);
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){heartbeat();refresh().catch(()=>{});}});
 window.addEventListener('pagehide',()=>{clearInterval(beatTimer);clearInterval(pollTimer);if(channel)c.removeChannel(channel);});
 start().catch(e=>status(e.message));
})();
