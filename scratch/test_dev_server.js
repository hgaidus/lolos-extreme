const http = require('http');

http.get('http://localhost:3000/our-burning-man-experience', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const idx = data.indexOf('previous');
    if (idx !== -1) {
      console.log('Pagination HTML:', data.substring(idx - 100, idx + 300));
    } else {
      console.log('Previous not found, searching for next...');
      const idx2 = data.indexOf('next');
      if (idx2 !== -1) console.log('Next HTML:', data.substring(idx2 - 100, idx2 + 300));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
