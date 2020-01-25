/**
 * this file will be loaded before server started
 * you can register middleware
 * https://thinkjs.org/doc/middleware.html
 */

/**
 * 
 * think.middleware('xxx', http => {
 *   
 * })
 * 
 */

import xml2js from 'xml2js'

think.middleware("parse_xml", async http => {
	let contentType = http.type()
	if(contentType !== 'application/xml') {
		return
	}
	let payload = await http.getPayload();
	if(!payload) {
		return;
	}
	let parser = new xml2js.Parser({
		trim: true,
		explicitArray: false,
		explicitRoot: false
	});
	let parseString = think.promisify(parser.parseString, parser)
	let result = await parseString(payload)
	http._post = result
	
})