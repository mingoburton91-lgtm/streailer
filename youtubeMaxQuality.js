const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

function height(f) { return Number(f.height || 0); }
function bitrate(f) { return Number(f.tbr || f.vbr || f.abr || 0); }

async function resolveBestYouTubeSources(videoId) {
  try {
    const url = 'https://www.youtube.com/watch?v=' + videoId;
    const { stdout } = await execFileAsync('yt-dlp', [
      '--no-playlist', '--no-warnings', '--js-runtimes', 'deno',
      '--extractor-args', 'youtube:player_client=tv,android_sdkless,web,web_safari',
      '--dump-single-json', url
    ], { maxBuffer: 20 * 1024 * 1024, timeout: 45000 });
    const info = JSON.parse(stdout);
    const formats = (info.formats || []).filter(f => f.url && f.protocol && !String(f.protocol).includes('m3u8'));
    const progressive = formats.filter(f => f.vcodec !== 'none' && f.acodec !== 'none')
      .sort((a,b)=>height(b)-height(a)||bitrate(b)-bitrate(a));
    const videos = formats.filter(f => f.vcodec !== 'none' && f.acodec === 'none' && height(f)>0)
      .sort((a,b)=>height(b)-height(a)||bitrate(b)-bitrate(a));
    const audios = formats.filter(f => f.vcodec === 'none' && f.acodec !== 'none')
      .sort((a,b)=>bitrate(b)-bitrate(a));
    const p=progressive[0]||null, v=videos[0]||null, a=audios[0]||null;
    if (v && a && height(v) > height(p||{})) return {mode:'remux',videoUrl:v.url,audioUrl:a.url,height:height(v),quality:(v.format_note||height(v)+'p')};
    if (p) return {mode:'direct',url:p.url,height:height(p),quality:(p.format_note||height(p)+'p')};
    if (v && a) return {mode:'remux',videoUrl:v.url,audioUrl:a.url,height:height(v),quality:(v.format_note||height(v)+'p')};
    return null;
  } catch(e) {
    console.warn('[MaxQuality] yt-dlp resolution failed:', e?.stderr || e?.message || e);
    return null;
  }
}
module.exports={resolveBestYouTubeSources};
