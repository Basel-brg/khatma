import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioDir = path.join(__dirname, '../public/promo-assets');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const lines = [
  { id: 'scene1', text: 'ودّك تختم القرآن مع أهلك أو أصحابك ومحتار كيف ترتّب الأجزاء؟' },
  { id: 'scene2', text: 'مع تطبيق ختمة، أنشئ ختمتك برابط واحد وبدون أي تسجيل.' },
  { id: 'scene3', text: 'كل شخص يختار جزءه، مع ميزة إخفاء الاسم ليكون فاعل خير.' },
  { id: 'scene4', text: 'واقرأ مباشرة بالرسم العثماني مع استماع لأشهر القرّاء.' },
  { id: 'scene5', text: 'ختمة.. شارك الأجر واختم القرآن مع أحبابك، مجاني بالكامل.' },
];

console.log('Generating voiceover clips...');
lines.forEach(({ id, text }) => {
  const aiffPath = path.join(audioDir, `${id}.aiff`);
  const wavPath = path.join(audioDir, `${id}.wav`);
  // Use Majed voice with clear rate (approx 195 wpm)
  execSync(`say -v Majed -r 195 "${text}" -o "${aiffPath}"`);
  execSync(`ffmpeg -y -i "${aiffPath}" -ar 44100 "${wavPath}" 2>/dev/null`);
  fs.unlinkSync(aiffPath);
  console.log(`Generated ${id}.wav`);
});

// Download serene recitation for intro/background
console.log('Fetching serene Quranic ambient audio...');
try {
  execSync(`curl -sL "https://everyayah.com/data/Alafasy_128kbps/001001.mp3" -o "${path.join(audioDir, 'recitation_intro.mp3')}"`);
  console.log('Recitation audio downloaded.');
} catch (e) {
  console.log('Could not fetch recitation, will continue with voiceover only.');
}
