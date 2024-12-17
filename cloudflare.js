// cloudflare limits:
// 20000 files https://developers.cloudflare.com/pages/platform/limits/#files
// 2000 redirect rules https://developers.cloudflare.com/pages/configuration/redirects/
// 100 header rules https://developers.cloudflare.com/pages/configuration/headers/

const fs = require('fs');
const path = require('path');
const root = __dirname;
const nextYear = new Date();
nextYear.setFullYear(nextYear.getFullYear() + 1);

const headers = [];
const addHeader = (rule, values) => headers.push({rule, values});

addHeader("/*", ["Service-Worker-Allowed: /"]);

for(const type of ["app", "pwa"]) {
	addHeader(`/${type}/*`,
		["Cross-Origin-Embedder-Policy: require-corp",
		"Cross-Origin-Opener-Policy: same-origin",
		"Cross-Origin-Resource-Policy: cross-origin",
		'Link: <https://wide.video/app/1.6.15/>; rel="canonical"']);

	// `no-transform` disables re-compression
	// https://community.cloudflare.com/t/end-to-end-compression-for-pages/744695
	addHeader(`/${type}/:version/*`,
		[`Cache-Control: public, max-age=${60*60*24*365}, s-maxage=${60*60*24*365}, immutable, no-transform`,
		`Last-Modified: ${new Date().toUTCString()}`,
		`Expires: ${nextYear.toUTCString()}`]);

	// this is index file
	addHeader(`/${type}/:version/`, ["Content-Encoding: br"])

	for(const extension of ["css", "html", "js"])
		addHeader(`/${type}/:version/*.${extension}`, ["Content-Encoding: br"]);
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
		
		if(stats.isFile() && path.extname(file) === ".br") {
			const newFilePath = filePath.replace(/\.br$/, '');

			fs.renameSync(filePath, newFilePath);
			console.log(`Renamed: ${filePath} -> ${newFilePath}`);

			// cloudflare auto redirects .../file.html to .../file
			// potential workaround is to use `.html.html` extension
			/*
			if(newFilePath.endsWith(".html") && !newFilePath.endsWith("index.html")) {
				fs.copyFileSync(newFilePath, `${newFilePath}.html`);
				console.log(`Copied: ${newFilePath} -> ${newFilePath}.html`);
			}
				*/
		}
	}
}

//handleIndexFiles(path.join(root, "index"));
handleAppFiles(path.join(root, "app"));

// dynamic redirects (using *) and these with :splat-s to go last
const redirects = [
	"/favicon.ico /image/favicon.ico 200",
	`/app /app/1.6.15/ 307`,
	`/app/ /app/1.6.15/ 307`,
	`/pwa /pwa/1.6.15/ 307`,
	`/pwa/ /pwa/1.6.15/ 307`,
	"/pwa/* /app/:splat 200"];

const redirectsString = redirects.join("\n");
console.log(`creating _redirects file with ${redirects.length} rules.`);
console.log(redirectsString);
fs.writeFileSync("_redirects", redirectsString, 'utf8');

const headersString = headers.map(({rule, values}) => `${rule}\n\t${values.join("\n\t")}`).join("\n\n");
console.log(`creating _headers file with ${headers.length} rules.`);
console.log(headersString);
fs.writeFileSync("_headers", headersString, 'utf8');