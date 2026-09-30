/**
 * Resolve a YouTube video to the highest quality stream that still contains
 * both video and audio. Progressive formats are preferred because Stremio
 * expects one directly playable URL; adaptive 1080p/1440p/2160p YouTube
 * formats normally split audio and video and therefore require muxing/proxying.
 */
let innertubePromise;

async function getInnertube() {
  if (!innertubePromise) {
    innertubePromise = import('youtubei.js').then(({ Innertube }) => Innertube.create());
  }
  return innertubePromise;
}

function formatHeight(format) {
  return Number(format.height || (format.quality_label || '').match(/(\d+)p/)?.[1] || 0);
}

async function resolveBestProgressiveStream(videoId) {
  try {
    const youtube = await getInnertube();
    const info = await youtube.getBasicInfo(videoId);
    const formats = (info.streaming_data?.formats || [])
      .filter(f => f.url && f.has_audio !== false && f.has_video !== false)
      .sort((a, b) => formatHeight(b) - formatHeight(a) || Number(b.bitrate || 0) - Number(a.bitrate || 0));

    if (!formats.length) return null;
    const best = formats[0];
    return {
      url: best.url,
      height: formatHeight(best),
      quality: best.quality_label || (formatHeight(best) ? `${formatHeight(best)}p` : 'Max'),
      mimeType: best.mime_type || ''
    };
  } catch (error) {
    console.warn('[MaxQuality] Direct YouTube resolution failed:', error?.message || error);
    return null;
  }
}

module.exports = { resolveBestProgressiveStream };
