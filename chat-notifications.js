(() => {
 const client=window.squadUpSupabase;
 if(!client)return;
 let userId="",channel=null,generation=0,refreshTimer=null;
 const badges=[...document.querySelectorAll(".sq-unread-badge")];
 function paint(count){
  badges.forEach(b=>{b.hidden=count===0;b.textContent=count>99?"99+":String(count);});
  document.querySelectorAll(".sq-message-link").forEach(a=>a.setAttribute("aria-label",count?`Messages: ${count} unread`:"Messages"));
 }
 async function refresh(){
  const id=userId,version=generation;
  if(!id){paint(0);return;}
  const {count,error}=await client.from("direct_messages").select("id",{count:"exact",head:true}).eq("recipient_id",id).is("read_at",null);
  if(!error&&id===userId&&version===generation)paint(count||0);
 }
 function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refresh().catch(()=>{}),100);}
 async function connect(id){
  if(id===userId&&channel){schedule();return;}
  const version=++generation;
  userId=id;paint(0);
  if(channel){const old=channel;channel=null;await client.removeChannel(old);}
  if(!id||version!==generation)return;
  channel=client.channel("unread-badges-"+id).on("postgres_changes",{event:"*",schema:"public",table:"direct_messages",filter:"recipient_id=eq."+id},schedule).subscribe(state=>{if(state==="SUBSCRIBED")schedule();});
  await refresh();
 }
 client.auth.getSession().then(({data,error})=>{if(!error)connect(data.session?.user.id||"").catch(()=>{});});
 client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>connect(session?.user.id||"").catch(()=>{}),0);});
 window.addEventListener("squadup:refresh-unread",schedule);
 window.addEventListener("focus",schedule);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
 setInterval(()=>{if(!document.hidden)schedule();},30000);
})();
