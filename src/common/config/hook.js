'use strict';

/**
 * hook config
 * https://thinkjs.org/doc/middleware.html#toc-df6
 */
export default {
	route_parse: ["prepend", "subdomain"],
  payload_parse: ["prepend", "parse_xml"]
}