(() => {
 const $=s=>document.querySelector(s);
 const play=$('#play'),grid=$('#play > .grid'),main=grid?.querySelector('section');if(!main)return;
 document.documentElement.dataset.theme='dark';document.body.classList.add('dashboard-view');
 const layout=document.createElement('div');layout.className='dashboard-layout';
 const left=document.createElement('aside');left.className='dashboard-left';left.innerHTML='<section class="dashboard-card"><div class="dashboard-section-title"><h2>Friends</h2><span class="live-label">LIVE</span></div><div id="dashboard-friends"><p class="dashboard-empty">Sign in to find your teammates.</p></div><button class="dashboard-primary" data-community>Find friends <span>↗</span></button></section><section class="dashboard-card"><h2>Your squads</h2><div id="dashboard-squads"></div><button class="dashboard-primary" data-community>Manage squads <span>↗</span></button></section><section class="dashboard-card dashboard-mini-profile"><span class="dashboard-eyebrow">YOUR NEXT WIN</span><h2>Better together.</h2><p>Find your people.<br>Build your squad.</p><a href="profile.html">Complete your profile ↗</a></section>';
 const center=document.createElement('main');center.className='dashboard-center';
 const right=document.createElement('aside');right.className='dashboard-right';right.innerHTML='<section class="dashboard-card"><div class="dashboard-section-title"><h2>Friend requests</h2><span class="dashboard-dot"></span></div><div id="dashboard-requests"><p class="dashboard-empty">No new requests.</p></div><button class="dashboard-secondary" data-community>View all requests</button></section><section class="dashboard-card dashboard-settings"><h2>Settings</h2><a href="profile.html">Account settings <span>›</span></a><a href="profile.html">Game usernames <span>›</span></a><a href="messages.html">Messages & notifications <span>›</span></a><button data-community>Friends & privacy <span>›</span></button><button id="dashboard-invite">Invite a friend <span>↗</span></button><div class="dashboard-theme-label">Appearance <span>Dark ●</span></div><a class="dashboard-signout" href="login.html">Switch account <span>→</span></a></section>';
 layout.append(left,center,right);play.before(layout);play.id='legacy-play';layout.id='play';
 const composer=main.querySelector('details');composer.open=false;composer.classList.add('dashboard-composer');composer.querySelector('summary').textContent='+ Post a squad request';
 // Keep every original control and ID so the existing application keeps working.
 const intro=document.createElement('div');intro.className='dashboard-feed-intro';intro.innerHTML='<div><span class="dashboard-eyebrow">YOUR COMMUNITY</span><h2>For you</h2></div><a href="#post-request">+ Create a squad</a>';
 composer.id='post-request';center.append(composer);
 const games=document.createElement('details');games.className='dashboard-games';games.innerHTML='<summary>Explore games <span>Choose your next session ↗</span></summary>';games.append($('#tiles'));center.append(games);
 center.append($('#gamePlayers'));
 const filters=document.createElement('details');filters.className='dashboard-filters';filters.innerHTML='<summary>Find your match <span>Filters & search</span></summary>';[...main.querySelectorAll(':scope > .bar')].forEach(x=>filters.append(x));center.append(filters);
 center.append(intro,$('#feed'));
 const status=$('#status');center.append(status);
 const hub=main.querySelector('.hub-grid');
 for(const id of ['notifications','savedItems','trendingList']){const node=$('#'+id);if(node)right.append(node.closest('.card'));}
 const squad=$('#mySquads');if(squad)left.querySelector('#dashboard-squads').append(squad);
 const profile=$('#profile');if(profile){profile.hidden=true;left.append(profile);}
 const chat=grid.querySelector('.chat');if(chat)right.append(chat);
 // Hide the old marketing layout; IDs used by the app remain in the document.
 play.hidden=true;document.querySelectorAll('.hero,.world-section').forEach(x=>x.hidden=true);
 const nav=$('.nav .top');const search=document.createElement('input');search.className='dashboard-search';search.placeholder='Search squads…';search.setAttribute('aria-label','Search squads');search.addEventListener('input',()=>{const q=$('#q');q.value=search.value;q.dispatchEvent(new Event('input',{bubbles:true}));});nav.insertBefore(search,nav.querySelector('.links'));
 document.addEventListener('click',event=>{if(event.target.closest('[data-community]'))$('.community-launch')?.click();});
 $('#dashboard-invite').onclick=async()=>{const url=new URL('signup.html',location.href).href;try{await navigator.clipboard.writeText(url);$('#dashboard-invite').textContent='Invite link copied ✓';setTimeout(()=>$('#dashboard-invite').innerHTML='Invite a friend <span>↗</span>',2500);}catch{window.prompt('Copy your invite link',url);}};
 // Project the real friend list into the sidebars, reusing the existing action handlers.
 const update=()=>{
 const f=$('#community-friends'),p=$('#community-players');
 const accepted=f?[...f.children].filter(x=>x.textContent.includes(' · Friends')):[];
 const requests=f?[...f.children].filter(x=>x.textContent.includes('Incoming request')):[];
 const copy=(target,rows,empty)=>{target.innerHTML=rows.length?rows.slice(0,5).map(x=>x.outerHTML).join(''):'<p class="dashboard-empty">'+empty+'</p>';};
 copy($('#dashboard-friends'),accepted,'Your friends will appear here. Add a teammate to start.');copy($('#dashboard-requests'),requests,'You’re all caught up. No new requests.');
 const user=window.SquadCommunity;if(user){$('.live-label').textContent='TEAMMATES';}
 };
 window.addEventListener('squadup:social-updated',update);
 layout.addEventListener('click',event=>{const b=event.target.closest('[data-action][data-peer]');if(!b)return;const panel=$('.community-panel');const actual=[...panel.querySelectorAll('[data-action][data-peer]')].find(x=>x.dataset.peer===b.dataset.peer&&x.dataset.action===b.dataset.action);if(actual){b.disabled=true;actual.click();}});
 update();
})();
