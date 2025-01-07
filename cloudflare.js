const fs = require('fs');

const headers = `/*
	Access-Control-Allow-Headers: *
	Access-Control-Allow-Origin: *
	Access-Control-Expose-Headers: *
	Cache-Control: public, max-age=604800, s-maxage=604800, immutable
	Cross-Origin-Opener-Policy: same-origin
	Cross-Origin-Embedder-Policy: require-corp
	Cross-Origin-Resource-Policy: cross-origin\n\n`;


console.log(`creating _headers file.`);
console.log(headers);
fs.writeFileSync("_headers", headers, 'utf8');