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
    const salt = await bcrypt.genSalt(10);
    console.log(password)
    // const pss = '$2b$10$3Q.naGKVJxzL7QOO/tWY/OuspQ2LYFxo7zmUM06tNIs/OcdUURdwe'
    // const pss = '$2a$10$lYTr.wmfKNEyQre2IoWrGOse86wRZwTmEtKhTz4hIMmTelgH9/NUi'
    const pss = '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2'
    // const hash = await bcrypt.hash(password + '', salt);
    // const hash = await bcrypt.hash(password + '', 10);
    const hash = await bcrypt.compare('admin123', pss);
    return hash
  }


}
