'use strict';
import Base from './baseRest.js';
import iconv from 'iconv-lite'
import fs from 'fs'
const Hashids = require('hashids/cjs')
const rp = require('request-promise');
import * as crypto from "crypto";

export default class extends Base {


  async mock_requestPOST() {
    const appService = this.service('app')
    const app = new appService()
    // 发验证码
    // const sendLoginCode = await app.sendLoginCode('13594076127')
    // console.log(sendLoginCode)
    // {
    //             "msg": "操作成功",
    //             "data": null,
    //             "timestamp": 1569055186723,
    //             "code": 0
    //         }

    // 登录
    // const login = await app.login('13594076127',123456)
    //   "data": {
    //         "msg": "登录成功 ",
    //         "data": "{\"isNewRegister\":true,\"token\":\"user:app:token:18983159020441dbef8868e41f68ba88465a6c04a9d\"}",
    //         "timestamp": 1569055419444,
    //         "code": 0
    //     }

    // 用户信息
    // const getUserInfo = await app.getUserInfo('user:app:token:18983159020441dbef8868e41f68ba88465a6c04a9d');
    //  "data": {
    //             "lvId": 1,
    //             "lvName": "Lv1",
    //             "lvMinPoint": 0,
    //             "lvMaxPoint": 1499,
    //             "lvIcon": "https://img.cs.leshangche.com//images/level/1.png",
    //             "userId": 2388596,
    //             "userName": "18983159020",
    //             "nickname": "VN_59020",
    //             "avatar": "https://img.cs.leshangche.com//images/user_avatar/default_tx.png",
    //             "sex": 0,
    //             "payPoints": 20,
    //             "honor": 20,
    //             "updateTime": null,
    //             "isOwner": 0,
    //             "isApp": 4,
    //             "regTime": 1569055418,
    //             "province": 0,
    //             "city": 0,
    //             "district": 0,
    //             "brief": null
    //         },

    // 签到
    // const isUserSignIn = await app.isUserSignIn(58051,think.datetime(new Date('2019-09-01 00:00:00')));
    //  "msg": "操作成功",
    //         "data": {
    //             "counts": 0
    //         },
    //         "timestamp": 1569055874553,
    //         "code": 0

    // 收货地址
    // const getUserAddress = await app.getUserAddress(2388615,17051,1);
    //  "data": {
    //         "code": 0,
    //         "msg": "操作成功",
    //         "data": []
    //     }

    // 查询x7
    // const getReserveSituation = await app.getReserveSituation(88436);
    //"msg": "操作成功",
    //             "data": {
    //                 "isHave": false
    //             },
    //             "timestamp": 1569226761604,
    //             "code": 0

    // const getSign = await app.getSign('3025724');
    // "msg": "操作成功",
    //             "data": [
    //                 {
    //                     "userId": 2388594,
    //                     "sign": true
    //                 },
    //                 {
    //                     "userId": 2388595,
    //                     "sign": false
    //                 },
    //                 {
    //                     "userId": 2388596,
    //                     "sign": true
    //                 }
    //             ],
    //             "timestamp": 1569226981678,
    //             "code": 0

    // 是否绑定小程序
    // const getHasBind = await app.getHasBind('2388596');
    //     "code": 0,
    //     "msg": "",
    //     "data": {
    //         "getHasBind": {
    //             "msg": "操作成功",
    //             "data": {
    //                 "hasBind": true
    //             },
    //             "timestamp": 1569313634441,
    //             "code": 0
    //         }
    //     }

    // 发钱
    // const nonceStr = '5K8264ILTKCH16CQ25';
    // const partnerTradeNo = '1000009820141111123';
    // const amount = 30;
    // const desc = '';
    // const spbillCreateIp = '47.99.158.24';
    // const channel = 'qiushan'
    // const distinguish = 1
    // const enterprisePay = await app.enterprisePay(2388596,nonceStr,
    //     partnerTradeNo,amount,desc,spbillCreateIp,channel,distinguish);

    // 查询次数
    // const queryUserSeckillCount = await app.queryUserSeckillCount(2388596);
    // 修改次数
    // const modifyUserSeckillCount = await app.modifyUserSeckillCount(2388596, 300);
    // 开始时间
    const findNextSeckill = await app.findNextSeckill();


    return {findNextSeckill}
  }


  monk_decodeGET({id}){
    return this.encodeUserId(id)
  }


  encodeUserId(userId) {
    const salt = this.config('USER_ID_HASH_SALT');
    const hashids = new Hashids(salt)
    return hashids.encode(userId)
  }

  deCodeUserId(hashcode) {
    const salt = this.config('USER_ID_HASH_SALT');
    const hashids = new Hashids(salt)
    return hashids.decode(hashcode)
  }

  async appRequest(url, data) {
    const baseUrl = think.config('app.BASE_URL');
    const timestamp13 = new Date().getTime() - 1000 * 3;
    const appId = think.config('app.APPID');
    const appSecret = think.config('app.APPSECRET');
    const sign = this.makeAppSign(JSON.stringify(data), appSecret, timestamp13)
    const headers = {
      sign,
      appId,
      timestamp: timestamp13
    }
    const options = {
      method: 'POST',
      // proxy:'http://localhost:8888',
      url: baseUrl + url,
      body: data,
      headers,
      json: true // Automatically parses the JSON string in the response
    };
    return await rp(options);
  }

  /**
   * 加密header
   * @param json
   * @param appSecret
   * @param timeStamp
   * @returns {String}
   */
  makeAppSign(json, appSecret, timeStamp) {
    const appSecretMd5 = this.md5(appSecret).toUpperCase()
    const all = json + appSecretMd5 + timeStamp
    return this.md5(all).toUpperCase();
  }

  md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

}
