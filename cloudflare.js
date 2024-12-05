// cloudflare limits:
// 20000 files https://developers.cloudflare.com/pages/platform/limits/#files
// 2000 redirect rules https://developers.cloudflare.com/pages/configuration/redirects/
// 100 header rules https://developers.cloudflare.com/pages/configuration/headers/

const fs = require('fs');
const path = require('path');
const root = __dirname;
const nextYear = new Date();
nextYear.setFullYear(nextYear.getFullYear() + 1);

const appExpires = [
	// `no-transform` disables recompressing from br to gzip by Cloudflare, but also disables analytics injection
	// https://developers.cloudflare.com/cache/concepts/cache-control/
	// https://developers.cloudflare.com/images/polish/
	// https://developers.cloudflare.com/web-analytics/faq/#my-website-is-proxied-through-cloudflare-but-web-analytics-automatic-setup-is-not-working
	`Cache-Control: public, max-age=${60*60*24*365}, s-maxage=${60*60*24*365}, immutable, no-transform`,
	`Last-Modified: ${new Date().toUTCString()}`,
	`Expires: ${nextYear.toUTCString()}`];

let headerRulesCount = 1;
let headers = `/*
	Service-Worker-Allowed: /\n\n`;

for(const type of ["app", "pwa"]) {
	headerRulesCount += 5;
	headers += `/${type}/*
	Cross-Origin-Embedder-Policy: require-corp
	Cross-Origin-Opener-Policy: same-origin
	Cross-Origin-Resource-Policy: cross-origin
	Link: <https://wide.video/app/1.6.14-4/>; rel="canonical"

/${type}/:version/*
	${appExpires.join("\n\t")}

/${type}/:version/*.css
	Content-Encoding: br

/${type}/:version/*.html
	Content-Encoding: br

/${type}/:version/*.js
	Content-Encoding: br
	
/${type}/:version/
	Content-Encoding: br\n\n`;
}

function handleIndexFiles(dir) {
	const files = fs.readdirSync(dir);
	for(const file of files) {
		const oldPath = path.join(dir, file);
		const newPath = path.join(path.dirname(dir), file);
		fs.renameSync(oldPath, newPath);
		console.log(`Renamed: ${oldPath} -> ${newPath}`);
	}
}

function handleAppFiles(dir) {
	const files = fs.readdirSync(dir);

	for(const file of files) {
		const filePath = path.join(dir, file);
		const stats = fs.statSync(filePath);

		if(stats.isDirectory()) {
			handleAppFiles(filePath);
			continue;
		} 
		
		if(stats.isFile() && path.extname(file) === '.br') {
			const newFilePath = filePath.replace(/\.br$/, '');

			fs.renameSync(filePath, newFilePath);
			console.log(`Renamed: ${filePath} -> ${newFilePath}`);
		}
	}
}

handleIndexFiles(path.join(root, "index"));
handleAppFiles(path.join(root, "app"));

// dynamic redirects (using *) and these with :splat-s to go last
const redirects = [
	"/favicon.ico /image/favicon.ico 200",
	`/app /app/1.6.14-4/ 307`,
	`/app/ /app/1.6.14-4/ 307`,
	`/pwa /pwa/1.6.14-4/ 307`,
	`/pwa/ /pwa/1.6.14-4/ 307`,
	"/pwa/* /app/:splat 200"];

console.log(`creating _redirects file with ${redirects.length} rules.`);
console.log(redirects.join("\n"));
fs.writeFileSync("_redirects", redirects.join("\n"), 'utf8');

console.log(`creating _headers file with ${headerRulesCount} rules.`);
console.log(headers);
fs.writeFileSync("_headers", headers, 'utf8');