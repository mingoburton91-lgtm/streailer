const { spawn } = require('child_process');
const { resolveBestYouTubeSources } = require('./youtubeMaxQuality');

function registerMaxQualityRoute(app) {
  app.get('/max-quality/:videoId', async (req, res) => {
    const videoId = String(req.params.videoId || '');
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return res.status(400).send('Invalid video id');
    const src = await resolveBestYouTubeSources(videoId);
    if (!src) return res.status(502).send('Unable to resolve YouTube stream');

    if (src.mode === 'direct') return res.redirect(302, src.url);

    res.status(200);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Accept-Ranges', 'none');

    const ff = spawn('ffmpeg', [
      '-loglevel','error',
      '-i',src.videoUrl,
      '-i',src.audioUrl,
      '-map','0:v:0','-map','1:a:0',
      '-c','copy',
      '-movflags','frag_keyframe+empty_moov+default_base_moof',
      '-f','mp4','pipe:1'
    ], { stdio: ['ignore','pipe','pipe'] });

    let started = false;
    ff.stdout.on('data', chunk => { started = true; if (!res.write(chunk)) ff.stdout.pause(); });
    res.on('drain', () => ff.stdout.resume());
    ff.stderr.on('data', d => console.warn('[MaxQuality/ffmpeg]', String(d).trim()));
    ff.on('close', code => {
      if (!res.writableEnded) {
        if (!started && code) res.destroy();
        else res.end();
      }
    });
    req.on('close', () => { if (!ff.killed) ff.kill('SIGKILL'); });
  });
}
module.exports = { registerMaxQualityRoute };
