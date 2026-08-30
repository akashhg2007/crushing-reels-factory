const fs = require('fs');
const path = require('path');

const urlsFile = fs.readFileSync(path.join(__dirname, '../downloads/upload_urls.txt'), 'utf-8');
const urls = urlsFile.split('\n').filter(l => l.trim()).map(line => {
  const [id, url] = line.split(': ');
  return { id: id.trim(), url: url.trim() };
});

const titles = [
  "This Level is IMPOSSIBLE! 😱 #shorts",
  "POV: You're stuck at Level 58 💀 #shorts",
  "When the game gets REAL #gaming #shorts",
  "I can't believe I passed this! 🔥 #shorts",
  "This boss is UNDEFEATED! 👑 #gaming #shorts",
  "Wait for it... 😂 #shorts #gaming",
  "Pro vs Noob moments 🎮 #shorts",
  "Almost had a heart attack! 💪 #shorts",
  "The hardest level EVER! 😤 #gaming #shorts",
  "Watch till the END! 🤯 #shorts"
];

const descriptions = [
  "Wait for the ending! 😱\\n\\nFollow for more gaming content!\\n\\n#shorts #gaming #viral #fyp #trending",
  "Can you beat this level? Comment below! 👇\\n\\n#shorts #gaming #mobilegaming #viral",
  "This had me screaming! 😂\\n\\nLike & Subscribe for more!\\n\\n#shorts #gaming #funny #viral",
  "POV: When you finally beat the level 🎉\\n\\n#shorts #gaming #win #viral #fyp",
  "Tag someone who needs to see this! 👀\\n\\n#shorts #gaming #tag #viral"
];

let script = `interface Env {
  KV: KVNamespace;
  YOUTUBE_CLIENT_ID: string;
  YOUTUBE_CLIENT_SECRET: string;
  YOUTUBE_REFRESH_TOKEN: string;
}

const VIDEO_URLS = ${JSON.stringify(urls)};

const TITLES = ${JSON.stringify(titles)};

const DESCS = ${JSON.stringify(descriptions)};

async function getToken(env: Env): Promise<string> {
  const c = await env.KV.get("tok");
  if (c) return c;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {"Content-Type":"application/x-www-form-urlencoded"},
    body: new URLSearchParams({client_id:env.YOUTUBE_CLIENT_ID,client_secret:env.YOUTUBE_CLIENT_SECRET,refresh_token:env.YOUTUBE_REFRESH_TOKEN,grant_type:"refresh_token"}),
  });
  const d = await r.json() as any;
  await env.KV.put("tok", d.access_token, {expirationTtl:3000});
  return d.access_token;
}

async function upload(url: string, title: string, desc: string, token: string): Promise<string> {
  const vr = await fetch(url);
  const vb = await vr.blob();
  const m = {snippet:{title:title.substring(0,100),description:desc,tags:["gaming","shorts","viral","fyp"],categoryId:"20"},status:{privacyStatus:"public",selfDeclaredMadeForKids:false}};
  const f = new FormData();
  f.append("metadata", new Blob([JSON.stringify(m)],{type:"application/json"}));
  f.append("video", vb);
  const r = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",{method:"POST",headers:{Authorization:"Bearer "+token},body:f});
  const d = await r.json() as any;
  if(d.error) throw new Error(d.error.message);
  return d.id;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const p = JSON.parse(await env.KV.get("prog") || '{"u":[]}');
    const pend = VIDEO_URLS.filter((v:any)=>!p.u.includes(v.id));
    if(!pend.length) return;
    const tok = await getToken(env);
    for(let i=0;i<Math.min(2,pend.length);i++){
      const v = pend[i];
      const idx = (p.u.length+i)%TITLES.length;
      try{
        const vid = await upload(v.url, TITLES[idx], DESCS[idx%5], tok);
        p.u.push(v.id);
        await env.KV.put("prog", JSON.stringify(p));
        console.log("OK: https://youtube.com/shorts/"+vid);
      }catch(e:any){console.log("FAIL: "+e.message);}
      if(i<1) await new Promise(r=>setTimeout(r,30000));
    }
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const p = JSON.parse(await env.KV.get("prog") || '{"u":[]}');
    return new Response(JSON.stringify({total:VIDEO_URLS.length,done:p.u.length,left:VIDEO_URLS.length-p.u.length}));
  },
};
`;

fs.writeFileSync(path.join(__dirname, 'src/index.ts'), script);
console.log('Worker generated with ' + urls.length + ' videos');
