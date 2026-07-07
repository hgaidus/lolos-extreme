const http = require('http');
http.get('http://localhost:3000/2015-herb-and-lolos-migration-west', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const links = data.match(/<link[^>]+rel="stylesheet"[^>]+>/g) || [];
    console.log('Stylesheets in live page:');
    links.forEach(l => console.log(l));
  });
}).on('error', e => console.error('Error:', e.message));
