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
    const token = await tokenService.createToken({})
    return token
  }


}
