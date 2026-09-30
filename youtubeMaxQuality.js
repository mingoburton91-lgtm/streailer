/**
 * Resolve the best YouTube playback sources.
 * Prefer a single progressive A/V stream when it already reaches the maximum
 * resolution. Otherwise expose the best separate video + audio tracks so the
 * addon can remux them without re-encoding.
 */
let innertubePromise;
async function getInnertube() {
  if (!innertubePromise) innertubePromise = import('youtubei.js').then(({ Innertube }) => Innertube.create());
  return innertubePromise;
}
function height(f) { return Number(f.height || (f.quality_label || '').match(/(\d+)p/)?.[1] || 0); }
function bitrate(f) { return Number(f.bitrate || f.average_bitrate || 0); }
async function resolveBestYouTubeSources(videoId) {
  try {
    const yt = await getInnertube();
    const info = await yt.getBasicInfo(videoId);
    const sd = info.streaming_data || {};
    const progressive = (sd.formats || []).filter(f => f.url).sort((a,b)=>height(b)-height(a)||bitrate(b)-bitrate(a));
    const adaptive = (sd.adaptive_formats || []).filter(f => f.url);
    const videos = adaptive.filter(f => height(f)>0 && String(f.mime_type||'').startsWith('video/'))
      .sort((a,b)=>height(b)-height(a)||bitrate(b)-bitrate(a));
    const audios = adaptive.filter(f => String(f.mime_type||'').startsWith('audio/'))
      .sort((a,b)=>bitrate(b)-bitrate(a));
    const bestProgressive = progressive[0] || null;
    const bestVideo = videos[0] || null;
    const bestAudio = audios[0] || null;
    if (bestVideo && bestAudio && height(bestVideo) > height(bestProgressive || {})) {
      return { mode:'remux', videoUrl:bestVideo.url, audioUrl:bestAudio.url, height:height(bestVideo),
        quality:bestVideo.quality_label || `${height(bestVideo)}p` };
    }
    if (bestProgressive) return { mode:'direct', url:bestProgressive.url, height:height(bestProgressive),
      quality:bestProgressive.quality_label || `${height(bestProgressive)}p` };
    return null;
  } catch (e) {
    console.warn('[MaxQuality] YouTube resolution failed:', e?.message || e);
    return null;
  }
}
module.exports = { resolveBestYouTubeSources };
