const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

function height(f){ return Number(f.height || 0); }
function bitrate(f){ return Number(f.tbr || f.vbr || f.abr || 0); }

async function resolveBestYouTubeSources(videoId) {
  try {
    const url='https://www.youtube.com/watch?v='+videoId;
    const {stdout}=await execFileAsync('yt-dlp',[
      '--no-warnings','--no-cache-dir','--no-playlist',
      '-J','--js-runtimes','node',
      '--extractor-args','generic:impersonate',
      '--ignore-no-formats-error',url
    ],{maxBuffer:20*1024*1024,timeout:90000});
    const info=JSON.parse(stdout);
    const formats=(info.formats||[]).filter(f=>f.url && !String(f.format_id||'').startsWith('sb'));
    const videos=formats.filter(f=>f.vcodec && f.vcodec!=='none' && f.acodec==='none' && height(f)>0);
    const h264=videos.filter(f=>String(f.vcodec).startsWith('avc1')||String(f.vcodec).includes('h264'))
      .sort((a,b)=>height(b)-height(a)||bitrate(b)-bitrate(a));
    const anyVideo=videos.sort((a,b)=>height(b)-height(a)||bitrate(b)-bitrate(a));
    const audios=formats.filter(f=>f.acodec && f.acodec!=='none' && f.vcodec==='none');
    const aac=audios.filter(f=>String(f.acodec).startsWith('mp4a')).sort((a,b)=>bitrate(b)-bitrate(a));
    const audio=aac[0]||audios.sort((a,b)=>bitrate(b)-bitrate(a))[0];
    const video=h264[0]||anyVideo[0];
    if(video?.url && audio?.url) {
      console.log('[MaxQuality] selected '+height(video)+'p '+video.vcodec+' + '+audio.acodec);
      return {mode:'remux',videoUrl:video.url,audioUrl:audio.url,height:height(video),quality:height(video)+'p',
        httpHeaders:info.http_headers||{}};
    }
    const muxed=formats.filter(f=>f.vcodec&&f.vcodec!=='none'&&f.acodec&&f.acodec!=='none')
      .sort((a,b)=>height(b)-height(a)||bitrate(b)-bitrate(a))[0];
    if(muxed?.url) return {mode:'direct',url:muxed.url,height:height(muxed),quality:height(muxed)+'p'};
    return null;
  } catch(e) {
    console.warn('[MaxQuality] Tubio method failed:',e?.stderr||e?.message||e);
    return null;
  }
}
module.exports={resolveBestYouTubeSources};
