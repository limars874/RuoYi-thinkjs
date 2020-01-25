'use strict';
import Base from './baseRest.js';
import path from 'path';
import fs from 'fs';

export default class extends Base {

  userModel = this.model('user');


  /**
   * 接收微信端的code,获取token以及用户信息
   *
   * @return {[type]} [description]
   */
  async indexGET({ code, state }) {
    //用code获取用户信息
    // console.log('get user')
    let wechatService = this.service('wechat')
    let wechat = new wechatService()
    let userInfo = await wechat.userInfo(code)
    if (userInfo == null || !userInfo.openid) {
      return this.fail('授权失败');
    }

    //用户信息保存数据库，用户id保存session
    let result = await this.userModel.regist(userInfo)
    await this.session(think.config('USER_LOGIN_KEY'), result.id)

    //跳转回正常页面
    let realUrl = await wechat.getRealRedirectUrl(state)
    this.redirect(realUrl)
  }


  async oauthfailAction() {
    this.display()

  }


  /**
   * 获取用户信息
   */
  async userInfo() {
    let _debug = think.config('_DEBUG_')
    let debuguserid = 2
    if (_debug) {
      let user = await this.model('user').where({ id: debuguserid }).find()
      return user
    }
    let USER_LOGIN_KEY = think.config('USER_LOGIN_KEY')
    let userid = await this.session(USER_LOGIN_KEY)
    if (think.isEmpty(userid)) {
      throw 30000
    }
    let user = await this.model('user').where({ id: userid }).find()
    if (!user.id) {
      throw 30000
    }
    return user;
  }

  async __before() {
    let { module, controller, action } = this.http
    let reqUrl = `${module}/${controller}/${this.id}${action.toUpperCase()}`
    think.debugLog('请求action: ' + reqUrl, 'red')
    let whiteActions = think.config('white_actions')
    try {
      let userinfo = await this.userInfo()
      this.userinfo = userinfo
    } catch (e) {
      if (whiteActions.indexOf(reqUrl) < 0) {
        //产生授权信息
        let realUrl = this.header('x-page-href')
        let wechatService = this.service('wechat')
        let wechat = new wechatService()
        let oauthUrl = await wechat.oauthUrl(realUrl)
        return this.fail(403, '无权限', { oauthUrl })
      }
    }

  }

  /**
   * 微信用户数据
   * @param id
   * @returns {*}
   */
  async infoGET({ id }) {
    if (!id) {
      // console.log(this.userinfo);
      return this.userinfo
    }
    return this.userModel.findById(id)
  }

  /**
   * 根据openid获取奖品列表
   * @param openid
   * @returns {Promise.<*>}
   */
  async prizeinfosGET({ openid }) {
    const prizeInfos = await this.model('prize_log').where({ user_openid: openid, prize_id: ['!=', 3] }).select();
    if (prizeInfos && prizeInfos.length > 0) {
      return { state: 'ok', data: { prizeInfos: prizeInfos } };
    } else {
      return { state: 'fail', msg: 'no_prize' }
    }


  }

  /**
   * 抽奖请求
   */
  async lotPOST(get, { openid }) {

    const userId = await this.getUserIdByOpenid(openid);
    if(!userId){
      return { status: 'fail', type: 'invalid_user' };
    }
    
    const trans = await this.userModel.transaction(async () => {
      // 判断并发请求
      await this.userModel.where({ id: userId }).increment('is_get_prize', 1)
      // await this.sleep(200);
      const lotCount = await this.userModel.where({ id: userId }).find();
      if (lotCount.is_get_prize > 1) {
        return { status: 'fail', msg: 'no_flush' };
      }


      // 根据openid判断还有没有抽奖机会
      let lotteryChance = await this.lotteryChance(openid)
      const isVote = await this.isVote(openid);
      if (!isVote.status) {
        lotteryChance = 0;
      }
      if (lotteryChance < 1) {
        await this.userModel.where({ id: userId }).update({ is_get_prize: 0 })
        return { state: 'fail', msg: 'no_chance' }
      }
      if (true) {
        const AwardList = await this.model('prize').where({ store: ['>', '0'] }).select();
        if (AwardList.length <= 0) {
          await this.userModel.where({ id: userId }).update({ is_get_prize: 0 })
          return { state: 'fail', msg: 'no_award' };
        }
        const lottery = await this.getrand(AwardList);
        console.log(lottery);

        // 谢谢惠顾
        // if(lottery.id == 5) {
        //   const result = {
        //     id: lottery.id,
        //     name: lottery.name,
        //     code: prize_code
        //   }
        //   console.log('抽到奖为--' + lottery.name)
        //   return { state: 'success', result };
        // }

        //如果都没问题，生成兑奖码，写入log，返回奖品
        const prize_code = await this.randPrizeCode();
        const addPrizeLog = await this.model('prize_log').add({
          user_openid: openid,
          prize_id: lottery.id,
          prize_name: lottery.name,
          prize_code
        });
        if (addPrizeLog) {
          await this.model('prize').where({ id: lottery.id }).decrement('store', 1);
        }
        lotteryChance = await this.lotteryChance(openid)
        const result = {
          id: lottery.id,
          name: lottery.name,
          code: prize_code,
          chance: lotteryChance
        }
        console.log('抽到奖为--' + lottery.name)
        await this.userModel.where({ id: userId }).update({ is_get_prize: 0 })
        return { state: 'ok', data: result };

      } else {
        return { state: 'fail', msg: 'canlottery' }
      }
    })
    return trans;
  }

  /**
   *     生成一个code供兑奖比对
   */

  async randPrizeCode() {
    let haveUuid = true;
    let uuid;
    while (haveUuid) {
      uuid = this.generateUID(5);
      const code = await this.model('prize_log').where({ prize_code: uuid }).find();
      if (!code.id) {
        haveUuid = false;
      }
    }
    return uuid;
  }

  /**
   * 生成n位的随机字母+数字组合,建议4~6
   * @param num
   * @returns {string}
   */
  generateUID(num) {
    const zero = new Array(num).join("0");
    return (zero + (Math.floor(Math.random() * Math.pow(36, num))).toString(36)).slice(-num).toUpperCase();
  }

  /**
   * 请求抽奖次数
   * @param get
   * @param openid
   * @returns {Promise.<void>}
   */
  async chancePOST(get, { openid }) {
    const prizeList = await this.model('prize').where('1=1').select();
    const isVote = await this.isVote(openid);
    if (isVote.status) {
      return {
        state: 'ok',
        data: { prizelist: prizeList, chance: await this.lotteryChance(openid), isvote: isVote.status }
      };
    } else {
      return { state: 'ok', data: { prizelist: prizeList, chance: 0, isvote: isVote.status } };
    }

  }

  /**
   * 判断今天是否投票3次（有机会抽奖）
   */
  async isVote(openid) {
    return await this.model('star_log').isStar(openid);
  }

  /**
   * 根据openid计算抽奖次数
   * @param openid
   * @returns {Promise.<void>}
   */
  async lotteryChance(openid) {
    const prizeLogWhere = "(`user_openid` = '" + openid + " ')  AND to_days(`create_date`) = to_days(now())"
    console.log('wechat once')
    const lotCount = await this.model('prize_log').where(prizeLogWhere).count();
    const shareCount = await this.moreChance(openid);
    const MAX_CHANCE_NUM = think.config('setup.MAX_CHANCE_NUM');
    return MAX_CHANCE_NUM - lotCount + shareCount;
  }

  /**
   * 分享成功加sharelog
   * @returns {Promise.<void>}
   */
  async sharePOST(get, { openid }) {
    const share = await this.model('share_log').add({ open_id: openid })
    return { state: 'ok' }
  }

  /**
   * 根据openid计算微信分享加次数
   * @param openid
   * @returns {Promise.<void>}
   */
  async moreChance(openid) {
    const shareLogWhere = "(`open_id` = '" + openid + " ')  AND to_days(`create_date`) = to_days(now())"
    const share = await this.model('share_log').where(shareLogWhere).find();
    return share.id ? 1 : 0;
  }


  /**
   * 根据code判断是否可以去抽奖
   * @param openid
   */
  async canLottery(code, openid) {

    //查看code标志
    const coderesult = await this.model('code').where({ code: code }).find();
    if (!coderesult.id) {
      return false;
    }
    if (coderesult.is_use && coderesult.is_use == 1) {
      return false;
    }
    const prizeLogWhere = "(`user_openid` = '" + openid + " ')  AND to_days(`create_date`) = to_days(now())"
    console.log('wechat once')
    const prizeLogResult = await this.model('prize_log').where(prizeLogWhere).find();
    if (prizeLogResult.id) {
      return false
    }

    return true;
  }

  /**
   * 如果奖品是之前抽到的同样奖品，返回fail表示谢谢参与
   * 如果已获得奖品里面已有实物奖，再次抽到实物奖，也返回fail表示谢谢参与
   * @param lottery
   * @returns {}
   */
  async isDuplicateLottery(lottery, openid) {
    const prizeList = await this.model('prize').where('1=1').select();
    let haveObjectPrizeIdList = [];
    prizeList.map(function (item) {
      if (item.type == 0) {
        haveObjectPrizeIdList.push(item.id);
      }
    })
    const prizes = await this.model('prize_log').where({ user_openid: openid }).select();
    console.log(prizes);
    if (prizes.length == 4) {
      return { state: true, type: 'full' };
    }
    if (prizes.length == 0) {
      return { state: false, type: 'empty' };
    } else {

      const isObjectInPrizes = prizes.some(function (value, index, array) {
        return haveObjectPrizeIdList.indexOf(value.prize_id) != -1
      })
      const isObjectInLottery = haveObjectPrizeIdList.indexOf(lottery.id) != -1
      if (isObjectInPrizes && isObjectInLottery) {
        return { state: true, type: 'object' };
      }

      const isValueInPrizes = prizes.some(function (value, index, array) {
        return value.prize_id == lottery.id;
      })
      if (isValueInPrizes) {
        return { state: true, type: 'duplicate' };
      }
    }
    return { state: false, type: 'other' };
  }

  /**
   * 获取随机抽奖数
   * @param min
   * @param max
   * @returns {{randkey: *}}
   */
  async getrand(AwardList) {
    //数组是模拟数据，正常是应该从后台配置文件或者数据库获取
    //let AwardList = [
    //	{'id':1,'prize':'平板电脑','probability':1},
    //	{'id':2,'prize':'数码相机','probability':5},
    //	{'id':3,'prize':'MP3播放器','probability':10},
    //	{'id':4,'prize':'4G有个盘','probability':12},
    //	{'id':5,'prize':'10Q币','probability':22},
    //	{'id':6,'prize':'谢谢参与','probability':50},
    //]


    let AwardListProbability = [];
    for (let i = 0, len = AwardList.length; i < len; i++) {
      AwardListProbability[i] = AwardList[i].probability;
    }
    let AwardNum = this.getRandomAwardNum(AwardListProbability);
    return AwardList[AwardNum];

  }

  /**
   * 返回奖品序号
   * @param ProbabilityArr 奖品中奖概率的整数数组
   */
  getRandomAwardNum(ProbabilityArr) {
    let result;
    let sumArr = ProbabilityArr.reduce((acc, val) => acc + val);
    for (let i = 0, len = ProbabilityArr.length; i < len; i++) {
      let randNum = this.getRandomIntInclusive(1, sumArr);
      if (randNum <= ProbabilityArr[i]) {
        result = i;
        break;
      } else {
        sumArr = sumArr - ProbabilityArr[i];
      }
    }
    return result;
  }

  /**
   * 获取任意整数范围内的随机数，包括min和max
   * 不包括
   * @param min
   * @param max
   * @returns {*}
   */
  getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }


}
