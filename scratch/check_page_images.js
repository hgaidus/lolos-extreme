const http = require('http');

http.get('http://localhost:3000/our-burning-man-experience', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const matches = [...d.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
    console.log('Total images found on page:', matches.length);
    matches.forEach((m, i) => console.log(i + ':', m[1]));
  });
}).on('error', err => console.error(err));
