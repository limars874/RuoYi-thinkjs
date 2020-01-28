/**
 * token管理器
 */
'use strict';

import rp from 'request-promise';
import * as crypto from "crypto";
import path from 'path';
import fse from 'fs-extra';

export default class extends think.service.base {

  init(...args) {
    super.init(...args);
  }

  async getIpLocation(ipAddr) {
    if (ipAddr === '127.0.0.1') {
      return "内网IP";
    }
    const ipUrl = 'http://ip.taobao.com/service/getIpInfo.php'
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36'
    }
    const param = { ip: ipAddr }
    const options = {
      method: 'GET',
      url: ipUrl,
      qs: param,
      headers,
      json: true // Automatically parses the JSON string in the response
    };
    try {
      const res = await rp(options);
      return res.data.region + ' ' + res.data.city
    } catch (err) {
      return '查询失败'
    }
  }

}
