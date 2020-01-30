'use strict';
import Base from './baseRest.js';
import iconv from 'iconv-lite'
import fs from 'fs'

const Hashids = require('hashids/cjs')
const rp = require('request-promise');
import * as crypto from "crypto";
import bcrypt from 'bcryptjs';

export default class extends Base {


  async mock_requestPOST({}, { password }) {
    const tokenService = new (think.service('Token'))
    // const token = await tokenService.createToken({}, this)
    // let result = think.config('error', undefined, 'api')
    // const iPService = new (think.service('IpKit'))
    // const res = await iPService.getIpLocation('222.182.198.231')
    // const res = await tokenService.getLoginUser(this)
    // console.log(res.permissions)
    // this.json(res.permissions)
    const selectUserByUserName = await this.model('user').selectUserByUserName('admin1')
    return selectUserByUserName
  }


}
