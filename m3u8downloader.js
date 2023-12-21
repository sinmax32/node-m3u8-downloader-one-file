const https = require('https')
const http = require('http')
const path = require("path");
const urlib = require("url");
const fs = require('fs')

function create_options(urlstr) {
	var opt = {
		method: 'GET',
		headers: {
			//'Content-Type': 'application/json',
			//User-agen :
		},
	};

	var url = urlib.parse(urlstr, true)
	opt.hostname = url.hostname
	opt.port = url.port
	opt.path = url.path
	opt.protocol = url.protocol

	return opt
}

function get_and_save_file(urlstr, saveto) {

	var opt = create_options(urlstr)
	if (!opt) return

	var htp = null
	if (opt.protocol.indexOf('https') > -1) {
		htp = https
		if (!opt.port) opt.port = 443
	} else if (opt.protocol.indexOf('http') > -1) {
		htp = http
		if (!opt.port) opt.port = 80
	} else {
		return null
	}

	return new Promise((resolved, reject) => {
		try {
			var file = fs.createWriteStream(saveto)
			htp.request(opt, (response) => {
				response.pipe(file);
				file.on('finish', () => {
					file.close();
					resolved()
				});
			}).end();

		} catch (e) {
			reject(e)

		}
	})
}

function decryptTS(dat_in, key, iv) {
	//Sorry, test not pass
	const crypto = require( 'crypto')
	let decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
	let decrypted = decipher.update(dat_in);
	decrypted = decipher.final();
	return decrypted;
}

async function m3u8download(m3u8url, save2dir) {
	var m38dir = path.resolve(path.dirname(__filename), save2dir)
	if (!fs.existsSync(m38dir)) {
		fs.mkdirSync(m38dir)
	}

	var indexfile = path.resolve(m38dir, 'index.m3u8')
	await get_and_save_file(m3u8url, indexfile)
	var m38dat = fs.readFileSync(indexfile, 'utf8')
	if( !m38dat ) {
		console.log('Fail to get m3u8 !')
		return
	} else {
		fs.writeFileSync(path.resolve(m38dir, 'index.txt'), m3u8url)
	}

	var lines = m38dat.split('\n')
	var tslist = []
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].charAt(0) != '#') {
			if( lines[i].trim().length > 2 )
				tslist.push(lines[i].trim())
		}
	}
	
	var urlbase = m3u8url.substring(10)
	var urlbase = m3u8url.substring(0, urlbase.indexOf('/')+10)

	if (tslist.length > 0) {
		var ts_url = ''
		var tsave2 = ''
		for (var i = 0; i < tslist.length; i++) {
			var ts_url = tslist[i]

			if (ts_url.indexOf('http') > -1) {
				tsave2 = path.resolve(m38dir, path.basename(ts_url) )

			} else if (ts_url.indexOf('/') > -1) {
				ts_url = urlbase + ts_url
				tsave2 = path.resolve(m38dir, path.basename(ts_url) )

			} else {
				ts_url = path.dirname(m3u8url) + '/' + ts_url
				tsave2 = path.resolve(m38dir, ts_url )
			}

			//decryptTS()

			await get_and_save_file(ts_url, tsave2).then(_=>{
				fs.appendFileSync(path.resolve(m38dir, 'index.txt'), '\r\n' + path.basename(ts_url))
				console.log(path.basename(ts_url) + ' [SaveTo] ' + tsave2)

			}).catch((msg)=>{
				console.log('[Error]' + ts_url)
			})
		}

		

	}

}

var m3u8url = 'https://xxx.com/20231216/xxx/2000kb/hls/index.m3u8'
var save2dir = 'xdirx'

m3u8url = process.argv[2]
save2dir = process.argv[3]

m3u8download(m3u8url, save2dir)
