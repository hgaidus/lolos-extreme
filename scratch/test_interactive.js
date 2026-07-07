const fs = require('fs');
const { cleanDrupalContent } = require('../src/utils/cleanContent.js');

const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const allPhotos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));

const getBaseStem = (u) => {
  const fn = (u || "").split('/').pop().split('?')[0];
  return fn.replace(/\.(preview|mini|thumbnail)\./i, '.');
};

let totalTestedStops = 0;
let totalInlineImgs = 0;
let totalMatchedInSlides = 0;
let totalDynamicallyAdded = 0;
let undefinedErrors = 0;

stops.forEach(s => {
  if (!s.travelogue) return;
  totalTestedStops++;
  const stopPhotos = allPhotos.filter(p => String(p.trip_stop_nid) === String(s.nid)).map(p => ({
    url: `/photos/${p.filename}`,
    title: p.title
  }));

  const htmlContent = cleanDrupalContent(s.travelogue, allPhotos);
  
  // Simulate useMemo allSlides
  const list = [...stopPhotos];
  const imgTags = htmlContent.match(/<img[^>]+>/gi) || [];
  imgTags.forEach((tag) => {
    const mSrc = tag.match(/src=["']([^"']+)["']/i);
    const mAlt = tag.match(/alt=["']([^"']*)["']/i);
    if (!mSrc || !mSrc[1]) return;
    const src = mSrc[1];
    const alt = mAlt ? mAlt[1] : "";
    
    const cleanSrc = getBaseStem(src);
    const exists = list.some(p => getBaseStem(p.url) === cleanSrc && cleanSrc.length > 0);
    if (!exists && src) {
      list.push({
        url: src,
        title: alt || `${s.title} Story Photo`
      });
    }
  });

  // Simulate clicking every inline img tag
  imgTags.forEach((tag) => {
    const mSrc = tag.match(/src=["']([^"']+)["']/i);
    if (!mSrc || !mSrc[1]) return;
    totalInlineImgs++;
    const src = mSrc[1];
    const cleanSrc = getBaseStem(src);
    
    let idx = list.findIndex(p => {
      const cleanP = getBaseStem(p.url);
      return cleanP === cleanSrc && cleanP.length > 0;
    });

    if (idx !== -1) {
      totalMatchedInSlides++;
    } else {
      totalDynamicallyAdded++;
      const mAlt = tag.match(/alt=["']([^"']*)["']/i);
      const alt = mAlt ? mAlt[1] : "";
      list.push({ url: src, title: alt || `${s.title} Photo` });
      idx = list.length - 1;
    }

    const currentPhoto = idx !== null ? list[idx] : null;
    if (!currentPhoto || !currentPhoto.url) {
      undefinedErrors++;
      console.error(`Error in stop ${s.slug}: clicked ${src} resulted in undefined slide!`);
    }
  });
});

console.log('--- TEST INTERACTIVE RESULTS ---');
console.log({
  totalTestedStops,
  totalInlineImgs,
  totalMatchedInSlides,
  totalDynamicallyAdded,
  undefinedErrors
});
