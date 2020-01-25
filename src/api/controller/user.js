'use strict';
import Base from './baseRest.js';
import NP from 'number-precision'

const Hashids = require('hashids/cjs')


export default class extends Base {

  redBagPayLog = this.model('red_bag_pay_log')

  /**
   * 根据手机号号码获取验证码
   * @param uuid
   * @param tel
   * @returns {Promise<{state: string}>}
   */
  async get_codePOST({}, { uuid, tel }) {
    // 前置验证
    if (!uuid || !tel) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const myReg = /^1[345789]\d{9}$/;
    if (!myReg.test(tel)) {
      return { state: 'fail', msg: 'INVALID_TEL' }
    }
    const decode = this.deCodeUserId(uuid)
    if (decode && decode.length === 0) {
      return { state: 'fail', msg: 'INVALID_USER_UID' }
    }
    const app_user_id = decode[0];
    const user = await this.model('user').where({ app_user_id }).find();
    if (!user.id) {
      return { state: 'fail', msg: 'INVALID_USER' }
    }
    // 发短信
    const appService = this.service('app')
    const app = new appService()
    const sendLoginCode = await app.sendLoginCode(tel) // 真发
    // const sendLoginCode = await { code: 0 } // 假发
    if (sendLoginCode.code === 0) {
      return { state: 'ok' }
    } else {
      return { state: 'fail', msg: 'SEND_ERROR' }
    }
  }

  /**
   * 注册登录接口
   * @returns {Promise<*>}
   */
  async loginPOST({}, { uuid, tel, code }) {
    // 前置验证
    if (!uuid || !tel || !code) {
      console.log(tel, uuid, code, 'INVALID_POST')
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const myReg = /^1[345789]\d{9}$/;
    if (!myReg.test(tel)) {
      console.log(tel, uuid, code, 'INVALID_TEL')
      return { state: 'fail', msg: 'INVALID_TEL' }
    }
    const decode = this.deCodeUserId(uuid)
    if (decode && decode.length === 0) {
      console.log(tel, uuid, code, JSON.stringify(decode), 'INVALID_USER_UID')
      return { state: 'fail', msg: 'INVALID_USER_UID' }
    }
    const app_user_id = decode[0];

    const mainUser = await this.model('user').where({ app_user_id }).find();
    if (!mainUser.id) {
      console.log(tel, uuid, code, app_user_id, 'INVALID_USER')
      return { state: 'fail', msg: 'INVALID_USER' }
    }
    // 先tel字段搜索user表看看此人有没有参与活动
    const loginUser = await this.model('user').where({ tel }).find();
    const isAction = !!loginUser.id;
    // console.log('isAction', isAction)
    if (isAction) {
      // 有参与活动
      const appService = this.service('app')
      const app = new appService()
      const sendLoginCode = await app.login(tel, code)
      // console.log(sendLoginCode)
      // 验证码
      if (sendLoginCode.code !== 0) {
        console.log(tel, uuid, code, app_user_id, 'NO_CHECK')
        return { state: 'fail', msg: 'NO_CHECK' }
      }


      const likeUserId = loginUser.app_user_id;
      if (likeUserId === app_user_id) {
        console.log(tel, uuid, code, app_user_id, 'NO_LIKE_SELF')
        return { state: 'fail', msg: 'NO_LIKE_SELF' }
      }

      const isLiked = await this.model('like_log').where({ app_user_id, like_user_id: likeUserId }).find();
      // console.log('isLiked', isLiked)
      if (isLiked.id) {
        // 已助力此人
        console.log(tel, uuid, code, app_user_id, 'HAVE_LIKE')
        return { state: 'fail', msg: 'HAVE_LIKE' }
      }
      // 搜他的助力记录次数
      const likeCount = await this.model('like_log').where({ like_user_id: likeUserId }).count()
      // console.log('likeCount', likeCount, think.config('setup.LIKE_PRESENT_USER_NUM'))
      if (likeCount > think.config('setup.LIKE_PRESENT_USER_NUM')) {
        console.log(tel, uuid, code, app_user_id, 'MAX_LIKE')
        return { state: 'fail', msg: 'MAX_LIKE' }
      }
      const todayWhere = `TO_DAYS( like_user_login_date ) = TO_DAYS(now()) AND like_user_id = ${likeUserId}`
      const likeCountToday = await this.model('like_log').where(todayWhere).count()
      // console.log('likeCountToday', likeCountToday, think.config('setup.LIKE_PRESENT_USER_NUM_PER_DAY'))
      if (likeCountToday > think.config('setup.LIKE_PRESENT_USER_NUM_PER_DAY')) {
        console.log(tel, uuid, code, app_user_id, 'MAX_LIKE_TODAY')
        return { state: 'fail', msg: 'MAX_LIKE_TODAY' }
      }

      // 写助力表, 按老人算
      const addData = {
        app_user_id: app_user_id,
        like_user_id: likeUserId,
        tel: tel,
        is_new_like_user: 0,
        is_like_user_login: 1,
        like_user_login_date: think.datetime(new Date())
      }
      if (mainUser.is_expire === 0) {
        // 没过期才加
        const addLike = await this.model('like_log').add(addData)
        // 写红包表
        const redBagData = {
          app_user_id: app_user_id,
          like_log_id: addLike,
          like_user_id: likeUserId,
          is_new_user: 0,
          type: 1,
          money: this.yuanToFen(think.config('setup.PRESENT_USER_LIKE_MONEY'))
        }
        const redBag = await this.model('red_bag_log').add(redBagData)
      }
      return { state: 'ok', data: { mainUserTel: this.formatPhone(mainUser.tel), isNew: false } }
    } else {
      // 没参与活动
      // console.log('no action')
      const loginAndSign = await this.loginAndCheck(tel, code) // 真发
      // 限制20人
      // 先计算已经拉新了多少人
      const newCount = await this.model('like_log').where({ app_user_id, is_new_like_user: 1 }).count()
      if (newCount >= 20) {
        console.log(tel, uuid, code, app_user_id, 'MORE_NEW')
        return { state: 'fail', msg: 'MORE_NEW' }
      }

      // console.log(loginAndSign)
      // const loginAndSign = { state: 'ok', data: { userId: 333, isUserSignIn: true, nickname: 'wowo' } } // 假发
      if (loginAndSign.state === 'ok') {
        const loginUserId = loginAndSign.data.userId;
        const isUserSignIn = loginAndSign.data.isUserSignIn;
        const nick_name = loginAndSign.data.nickname;
        const avatar = loginAndSign.data.avatar;
        const firstRedBag = await this.randomFirstRedBag();
        const first_money = firstRedBag.redBagNum;
        if (first_money === 0) {
          console.log(tel, uuid, code, app_user_id, 'MONEY_ERROR')
          return { state: 'fail', msg: 'MONEY_ERROR' }
        }
        const money_level = firstRedBag.moneyLevel;
        if (isUserSignIn) {
          // 有签到，老人
          const addData = {
            app_user_id: loginUserId,
            uuid: this.encodeUserId(loginUserId),
            first_money,
            money_level,
            total_money: first_money,
            head_img: avatar,
            tel,
            is_new: 0,
            nick_name
          }
          const addUser = await this.model('user').add(addData);
          // 写助力表
          const likeData = {
            app_user_id: app_user_id,
            like_user_id: loginUserId,
            tel: tel,
            is_new_like_user: 0,
            is_like_user_login: 1,
            like_user_login_date: think.datetime(new Date())
          }
          const addLike = await this.model('like_log').add(likeData)
          // 初始红包加到红包表
          const firstRedBagData = {
            app_user_id: loginUserId,
            like_log_id: addLike,
            is_new_user: 0,
            type: 3,
            money: first_money
          }
          const firstRedBag = await this.model('red_bag_log').add(firstRedBagData)

          if (mainUser.is_expire === 0) {
            // 没过期才加

            // 写红包表
            const redBagData = {
              app_user_id: app_user_id,
              like_log_id: addLike,
              like_user_id: loginUserId,
              is_new_user: 0,
              type: 1,
              money: this.yuanToFen(think.config('setup.PRESENT_USER_LIKE_MONEY'))
            }
            const redBag = await this.model('red_bag_log').add(redBagData)
          }

          return { state: 'ok', data: { mainUserTel: this.formatPhone(mainUser.tel), isNew: false } }
        } else {
          // 无签到，新人
          const addData = {
            app_user_id: loginUserId,
            uuid: this.encodeUserId(loginUserId),
            first_money,
            money_level,
            total_money: first_money,
            head_img: avatar,
            tel,
            is_new: 1,
            nick_name
          }
          const addUser = await this.model('user').add(addData);
          // 写助力表
          const likeData = {
            app_user_id: app_user_id,
            like_user_id: loginUserId,
            tel: tel,
            is_new_like_user: 1,
            is_like_user_login: 0
          }
          const addLike = await this.model('like_log').add(likeData)
          // 初始红包加到红包表
          const firstRedBagData = {
            app_user_id: loginUserId,
            like_log_id: addLike,
            is_new_user: 0,
            type: 3,
            money: first_money
          }
          const firstRedBag = await this.model('red_bag_log').add(firstRedBagData)
          return {
            state: 'ok',
            data: { mainUserTel: this.formatPhone(mainUser.tel), isNew: true, redBag: this.fenToYuan(first_money) }
          }
        }
      } else {
        console.log(tel, uuid, code, app_user_id, loginAndSign.msg)
        return { state: 'fail', msg: loginAndSign.msg }
      }

    }

  }

  /**
   * 发红包
   * @param userId
   * @param type
   * @returns {{msg: string, state: string}}
   */
  async send_red_bagPOST({}, { userId, type }) {
    // return { state: 'fail', msg: 'INVALID_POST' }
    // if (think.env === 'development') {
    //   console.log('dev env')
    //   return { state: 'ok', data: { level: 1 } }
    // }

    if (!userId || !type) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    if (type === 1) {
      // 立即红包
      let iRedBag = 0; // 立即真发红包
      // 查询没有领的现金红包
      let noPayRedBagMoneyList = await this.model('red_bag_log').setRelation(false).field('id,money').where({
        is_pay: 0, app_user_id: userId, type: 4
      }).select()
      let idList = [];
      for (let i = 0; i < noPayRedBagMoneyList.length; i++) {
        const item = noPayRedBagMoneyList[i];
        const redBagLogId = item.id
        const pay = await this.sendMoney(userId, redBagLogId, item.money, 4)
        if (pay.state === 'ok') {
          idList.push(redBagLogId)
          iRedBag = NP.plus(iRedBag, item.money)
        }
      }
      // 批量修改红包表is_pay状态
      if (idList.length > 0) {
        const u = await this.model('red_bag_log').where({ id: ['in', idList] }).update({
          is_pay: 1,
          pay_date: think.datetime(new Date())
        })
      }
      return { state: 'ok' }
    } else {
      // 大红包
      // return { state: 'fail' }
      const getReserveSituation = await this.getReserveSituation(userId); // x7订购情况
      const isOrderCar = getReserveSituation.isHave;// x7订购情况
      if (!isOrderCar) {
        await this.model('black_list').add({ app_user_id: userId }) // 加黑名单
        return { state: 'fail' }
      }

      const calcCurrentRedBag = await this.calcCurrentRedBag(userId);
      const min = this.yuanToFen(parseFloat(think.config('setup.BASE_MONEY_LOW')))
      const max = this.yuanToFen(parseFloat(think.config('setup.BASE_MONEY_HIGH')))
      if (calcCurrentRedBag >= min) {


        const bigLog = await this.model('red_bag_pay_log').where({
          app_user_id: userId,
          level: ['!=', 4]
        }).select();
        // console.log(bigLog)
        if (bigLog.length === 0) {
          const iRedBag = calcCurrentRedBag >= max ? max : min
          const level = calcCurrentRedBag >= max ? 2 : 1
          // 发钱
          const redBagLogId = calcCurrentRedBag >= max ? -2 : -1
          const pay = await this.sendMoney(userId, redBagLogId, iRedBag, level)
          if (pay.state === 'ok') {
            // 批量修改红包表is_pay状态
            if (level === 2) {
              const u = await this.model('red_bag_log').setRelation(false).where({
                type: ['!=', 4],
                app_user_id: userId
              }).update({
                is_pay: 1,
                pay_date: think.datetime(new Date())
              })
            } else if (level === 1) {
              const redBagList = await this.model('red_bag_log').setRelation(false).field('id, money').where({
                type: ['!=', 4],
                app_user_id: userId
              }).select();
              // 计算哪些id要改状态
              let tempMoney = 0;
              const idList = []
              redBagList.some(i => {
                if (tempMoney > min) {
                  return true
                } else {
                  tempMoney = NP.plus(tempMoney, i.money)
                  idList.push(i.id)
                }
              })
              if (idList.length > 0) {
                const u = await this.model('red_bag_log').setRelation(false).where({ id: ['in', idList] }).update({
                  is_pay: 1,
                  pay_date: think.datetime(new Date())
                })
              }
            }
            return { state: 'ok', data: { level } }
          } else {
            // 支付失败
            return { state: 'ok', msg: 'PAY_FAIL' }
          }
        } else {
          // 如果已经有了红包
          if (bigLog.length === 2) {
            return { state: 'fail', msg: 'HAVE_PAY' }
          }
          if (bigLog.length === 1) {
            if (bigLog[0].level === 1) {
              const iRedBag = calcCurrentRedBag > max ? max - min : 0
              // 发钱
              if (iRedBag > 0) {
                // 发钱
                const redBagLogId = -3
                const pay = await this.sendMoney(userId, redBagLogId, iRedBag, 3)
                if (pay.state === 'ok') {
                  // 批量修改剩余状态
                  await this.model('red_bag_log').setRelation(false).where({
                    type: ['!=', 4],
                    app_user_id: userId,
                    is_pay: 0
                  }).update({
                    is_pay: 1,
                    pay_date: think.datetime(new Date())
                  })
                  return { state: 'ok', data: { level: 3 } }
                } else {
                  // 支付失败
                  return { state: 'ok', msg: 'PAY_FAIL' }
                }
              }
            } else if (bigLog[0].level === 2) {
              return { state: 'fail', msg: 'HAVE_PAY' }
            }
          }
        }
      }
      return { state: 'fail', msg: 'PAY_ERROR' }
    }
  }

  /**
   * 直接补发，不走数据库
   * @param userId
   * @param password
   * @param money
   * @param red_bag_log_id -100开始
   * @returns {Promise<void>}
   */
  async back_pay_no_rulePOST({}, { userId, password, money, red_bag_log_id }) {
    if (!password || password !== 'os*&$@%#') {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const pay = await this.enterprisePay(userId, money) // 真发
    // const pay = { partnerTradeNo: '5', paymentNo: '1', resultCode: '2', paymentTime: '3', nonceStr: '4' } // 假发
    if (pay.paymentNo) {
      const addData = {
        app_user_id: userId,
        amount: money,
        result_code: 'back_pay_no_rule',
        partner_trade_no: pay.partnerTradeNo,
        payment_no: pay.paymentNo,
        payment_time: pay.paymentTime,
        nonce_str: pay.nonceStr
      }
      await this.model('pay_log').add(addData)
      // 支付成功
      return { state: 'ok' }
    } else {
      await this.model('pay_fail_log').add({
        app_user_id: userId, red_bag_log_id: red_bag_log_id, amount: money
      })
      return { state: 'fail', msg: 'PAY_FAIL' }
    }
  }


  /**
   * 补发
   * @param userId
   * @returns {Promise<{msg: string, state: string}|{state: string}>}
   */
  async back_payPOST({}, { userId }) {
    console.log('pay back money ', userId)
    return
    if (!userId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const payFail = await this.model('pay_fail_log').where({ app_user_id: userId, modify_date: null }).find();
    if (!payFail.id) {
      return { state: 'fail', msg: 'no back user' }
    }
    const pay = await this.enterprisePay(userId, payFail.amount) // 真发
    // const pay = { partnerTradeNo: '5', paymentNo: '1', resultCode: '2', paymentTime: '3', nonceStr: '4' } // 假发
    if (pay.paymentNo) {
      const addData = {
        app_user_id: userId,
        amount: payFail.amount,
        result_code: pay.resultCode,
        partner_trade_no: pay.partnerTradeNo,
        payment_no: pay.paymentNo,
        payment_time: pay.paymentTime,
        nonce_str: pay.nonceStr
      }
      await this.model('pay_log').add(addData)
      await this.model('red_bag_pay_log').where({
        app_user_id: userId, red_bag_log_id: payFail.red_bag_log_id, money: payFail.amount
      }).update({ have_pay: 1, pay_date: think.datetime(new Date()) })
      await this.model('pay_fail_log').where({ id: payFail.id }).update({ app_user_id: userId });
      // 支付成功
      return { state: 'ok' }
    } else {
      return { state: 'fail', msg: 'PAY_FAIL' }
    }


  }


  /**
   * 唯一索引式发红包
   * @param userId
   * @param redBagLogId 77元是-1，88是-2，11元是-3. 立即红包喊id算
   * @param money 单位分
   * @param level 1是77元红包，2是88元红包，3是11元红包，4是立即红包
   * @returns {Promise<void>}
   */
  async sendMoney(userId, redBagLogId, money, level) {
    // return { state: 'fail', msg: 'LOCK' }

    const lock = await this.model('user').where({
      app_user_id: userId,
      send_money_lock: 0
    }).update({ send_money_lock: 1 })
    // console.log('lock',lock)
    if (!lock) {
      return { state: 'fail', msg: 'LOCK' }
    }
    try {
      const sqlString = `INSERT INTO
       \`red_bag_pay_log\` (\`app_user_id\`,\`red_bag_log_id\`,\`money\`,\`level\`,\`create_date\`)
       VALUES
       (${userId},${redBagLogId},${money},'${level}','${think.datetime(new Date())}') `

      const add = await this.model('red_bag_pay_log').query(sqlString)
      if (add && add.affectedRows) {
        // 插入日志成功
        const pay = await this.enterprisePay(userId, money) // 真发
        // const pay = { partnerTradeNo: '5', paymentNo: '1', resultCode: '2', paymentTime: '3', nonceStr: '4' } // 假发
        if (pay.paymentNo) {
          const addData = {
            app_user_id: userId,
            amount: money,
            result_code: pay.resultCode,
            partner_trade_no: pay.partnerTradeNo,
            payment_no: pay.paymentNo,
            payment_time: pay.paymentTime,
            nonce_str: pay.nonceStr
          }
          await this.model('pay_log').add(addData)
          await this.model('red_bag_pay_log').where({
            app_user_id: userId, red_bag_log_id: redBagLogId, money
          }).update({ have_pay: 1, pay_date: think.datetime(new Date()) })
          // 支付成功
          await this.model('user').where({ app_user_id: userId, send_money_lock: 1 }).update({ send_money_lock: 0 })
          return { state: 'ok' }
        } else {
          // 支付失败
          await this.model('pay_fail_log').add({
            app_user_id: userId, red_bag_log_id: redBagLogId, amount: money
          })
          await this.model('user').where({ app_user_id: userId, send_money_lock: 1 }).update({ send_money_lock: 0 })
          return { state: 'fail', msg: 'PAY_FAIL' }
        }
      } else {
        await this.model('user').where({ app_user_id: userId, send_money_lock: 1 }).update({ send_money_lock: 0 })
        return { state: 'fail', msg: 'HAVE_INSERT' }
      }
    } catch (err) {
      await this.model('user').where({ app_user_id: userId, send_money_lock: 1 }).update({ send_money_lock: 0 })
      return { state: 'fail', msg: 'OTHER_ERROR' }
    }
  }

  /**
   * 检查项目结束时间（不能发红包）
   * @returns {Promise<boolean>}
   */
  async isRedBagEndTime(){
    const endTimeString = think.config('setup.RED_BAG_END_TIME')
    const endTime = new Date(endTimeString);
    const now = new Date()
    // console.log(now, endTime)
    return now >= endTime
  }

  async enterprisePay(userId, iRedBag) {
    const isEndTime  = await this.isRedBagEndTime();
    if(isEndTime){
      return {}
    }
    const nonceStr = this.generateNonceStr()
    const partnerTradeNo = 'x7r' + this.randomKey();
    const amount = iRedBag;
    const desc = '欧尚X7红包';
    const spbillCreateIp = '47.99.158.249';
    const channel = 'qiushan'
    const distinguish = 1
    const appService = this.service('app')
    const app = new appService()
    const enterprisePay = await app.enterprisePay(userId, nonceStr,
        partnerTradeNo, amount, desc, spbillCreateIp, channel, distinguish);
    if (enterprisePay.code === 0) {
      return enterprisePay.data
    } else {
      return {}
    }
  }

  randomKey() {
    let a = Math.floor(Math.random() * 1000 + 9900)
    return Date.now() + a
  }

  generateNonceStr(length) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var maxPos = chars.length;
    var noceStr = '';
    var i;
    for (i = 0; i < (length || 32); i++) {
      noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return noceStr;
  };

  /**
   * 分转元
   * @param money
   * @returns {number}
   */
  fenToYuan(money) {
    return NP.divide(money, 100)
    // return (money / 100).toFixed(2)
  }

  /**
   * 分转元保留整数
   * @param money
   * @returns {number}
   */
  fenToYuanNoFix(money) {
    return NP.round(NP.divide(money, 100), 0)
  }

  /**
   * 元转分
   * @param money
   * @returns {number}
   */
  yuanToFen(money) {
    return NP.times(money, 100)
  }

  async mock_testGET() {

    // const list = await this.model('red_bag_pay_log').where({
    //   level: ['!=', 4],
    //   have_pay: 1,
    //   create_date: ['>=', '2019-09-28 20:24:00']
    // }).select();
    // console.log('300 length', list.length)
    // const userList = list.map(i => i.app_user_id)
    // for (let i = 0; i < userList.length; i++) {
    //   const item = userList[i]
    //   console.log(i, item)
    //   const getReserveSituation = await this.getReserveSituation(item); // x7订购情
    //   const isOrderCar = getReserveSituation.isHave;// x7订购情况
    //   if (!isOrderCar) {
    //     await this.model('black_list').add({ app_user_id: item }) // 加黑名单
    //     console.log('add black_list', item)
    //   }
    // }
    // const appService = this.service('app')
    // const app = new appService()
    // const isUserSignIn = await app.getUserInfoByUserId(2007517)
    // const isUserSignIn = await app.isUserSignIn(2007517, think.datetime(new Date('2018-04-01 00:00:00')))
    // const filePath = path.join(think.config('uploadFileDIR'),'/upload/guide_detail_1561481124514.png')
    // const uploadFile = await app.uploadFile(filePath)
    // console.log(uploadFile)
    // if (uploadFile.code === 0) {
    //   return uploadFile.data;
    // } else {
    //   return uploadFile
    // }

    // const data = { app_user_id: 33, red_bag_log_id: 44, money: 33 }
    // const add = await this.model('red_bag_pay_log').add(data)
    // console.log(11111)
    // await this.model('black_list').add({ app_user_id: 33 })


    // return await this.showMoneyList()
    // const value = await this.calcDayDiff()
    // const userId = 133333
    // const isTodayUse = await this.newCalcSecKillChance(129)

    // const todayNumber = think.datetime(new Date(),'YYYYMMDD')
    // const usedActionList = await GRedis.zrangebyscore('SECKILL_COLLECTION_LISTS',0,todayNumber)
    // const resListLength = usedActionList.filter(i=>i !== todayNumber).length
    // const set = await this.syncUserKillCount()

    const isEndTime  = await this.isRedBagEndTime();
    return isEndTime
  }


  /**
   * 首页基本信息接口（用户无关
   * @returns {Promise<>}
   */
  async action_infoGET() {
    const totalMoney = await this.totalMoney();  // 总现金
    const showMoneyList = await this.showMoneyList();  // 晒单列表
    const shareContent = await this.shareContent();
    const secKillDate = ''; // 秒杀按钮下文字
    const maxSecKillNumber = parseInt(think.config('setup.SECKILL_DURATION_TIME')); // 总秒杀次数上限
    const minVRedBag = parseInt(think.config('setup.BASE_MONEY_LOW')); // 门槛金额下限
    const maxVRedBag = parseInt(think.config('setup.BASE_MONEY_HIGH')); // 门槛金额上限
    const expireHour = parseInt(think.config('setup.REDBAG_EXPIRE_HOUR')); // 过期小时数
    const data = {
      totalMoney: totalMoney.totalMoney,
      showMoneyList,
      secKillDate,
      maxSecKillNumber,
      minVRedBag,
      maxVRedBag,
      shareContent,
      expireHour
    }
    return { state: 'ok', data }
  }

  /**
   * 首页用户信息接口
   * @param userId
   * @param tel
   * @param avatar
   * @param nick_name
   * @returns {Promise<{msg: string, state: string}|{data: {currentRedBag: number, secKillChance: number, redBagExpireDate: Date, canSign: boolean, isOrderCar: boolean, signDate: number}, state: string}>}
   */
  async user_infoPOST({}, { userId, tel, avatar, nick_name }) {
    if (!userId || !tel || !avatar || !nick_name) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const isEndTime  = await this.isRedBagEndTime();
    console.log('userInfo', userId)
    const u = await this.model('user').where({ app_user_id: userId }).find();
    const isActive = !!u.id;
    if (isActive) {
      // 如果有参加过活动
      if (u.is_new === 1) {
        // 新人助力后第一次进页面

        // 先看看有没有自己的立即红包记录
        const redBagLog = await this.model('red_bag_log').where({
          is_new_user: 1, is_pay: 0, app_user_id: userId
        }).find();
        let iRedBag = 0;
        if (redBagLog.id) {
          iRedBag = redBagLog.money;
        } else {
          // 如果没发过，开始发立即红包两人份
          const immediateRedBag = this.randomImmediateRedBag()
          iRedBag = immediateRedBag;
          // 等级红包一人份，查询当时的助力表
          const likeLog = await this.model('like_log').where({
            like_user_id: userId, is_new_like_user: 1
          }).find();
          // 查询被助人被新人助了第几次
          if (!likeLog.id) {
            return { state: 'fail', msg: 'INVALID_LIKE_LOG' }
          }
          const likedCount = await this.model('like_log').where({
            app_user_id: likeLog.app_user_id, is_new_like_user: 1, is_like_user_login: 1
          }).count()
          // 获取被助人信息
          const mainUser = await this.model('user').where({ app_user_id: likeLog.app_user_id }).find();
          // 查看下一级红包是好多
          const redBag = await this.getRedBagByLevel(mainUser.money_level, likedCount + 1);
          // 三份红包一起发,一份自己的，两份被助的
          const now = new Date()
          const create_date = think.datetime(now)
          const redBagDataList = [
            {
              app_user_id: userId, like_log_id: likeLog.id, like_user_id: userId,
              is_new_user: 1, type: 4, money: immediateRedBag, create_date
            },
            {
              app_user_id: likeLog.app_user_id, like_log_id: likeLog.id, like_user_id: userId,
              is_new_user: 0, type: 4, money: immediateRedBag, create_date
            },
            {
              app_user_id: likeLog.app_user_id, like_log_id: likeLog.id, like_user_id: userId,
              is_new_user: 0, type: 1, money: redBag, create_date
            }
          ]
          const addRedBagList = await this.model('red_bag_log').addMany(redBagDataList);
        }

        // 去掉新人标识, 修改login_date
        const updateUser = await this.model('user').where({ app_user_id: userId }).update({
          is_new: 0, login_date: think.datetime(new Date()), head_img: avatar, nick_name
        });
        // 修改助力表登录记录 加助力统计到redis
        console.log('助力redis', app_user_id, 1)
        await this.incSecKillCount(likeLog.app_user_id, 1)
        const updateLike = await this.model('like_log').where({ like_user_id: userId }).update({
          is_like_user_login: 1,
          like_user_login_date: think.datetime(new Date())
        });
        // 组织回复：
        const currentRedBag = this.fenToYuan(u.first_money) // 当前手气金额为首次红包
        const redBagExpireDate = new Date(); // 按写入首次红包的时间计算过期时间

        const canSign = true; // 签到状态可签到
        const signDate = -1; // 无签到倒计时
        const secKillChance = 0; // 秒杀数字为0

        const getReserveSituation = await this.getReserveSituation(userId); // x7订购情况
        const isOrderCar = getReserveSituation.isHave;// x7订购情况
        if (isOrderCar) {
          await this.model('user').where({ app_user_id: userId }).update({ is_reserve_car: 1 })
        }
        const likeAvatarList = [] // 助力头像
        iRedBag = this.fenToYuan(iRedBag)
        // const isExpire = false;

        // const redBagExpireDate = new Date(newLoginDateUser.login_date); // 计算过期时间
        let isExpire
        isExpire = this.calcIsExpire(redBagExpireDate);
        if (isExpire) {
          await this.model('user').where({ app_user_id: userId }).update({ is_expire: 1 })
        }

        let isBindWeChat = false;
        if (!u.is_bind_we_chat) {
          const res = await this.isBindWeChat(userId);
          isBindWeChat = !!res.hasBind
        } else {
          isBindWeChat = true
        }

        const haveGetBigBag = false; // 是否已领
        const BigBagExpireDate = new Date((think.config('setup.REDBAG_EXPIRE_DATE'))); // 一阶段活动结束时间
        // iRedBag 立即红包
        const data = {
          currentRedBag, redBagExpireDate, canSign, signDate, type: 1, isBindWeChat, haveGetBigBag,isEndTime,
          secKillChance, isOrderCar, iRedBag, likeAvatarList, isExpire, shareId: u.uuid, BigBagExpireDate
        }
        return { state: 'ok', data }

      } else {

        // 不是新人 判断是否第一次登录，直接更新login_date

        await this.model('user').where({
          is_new: 0,
          login_date: null,
          app_user_id: userId
        }).update({ login_date: think.datetime(new Date()) })

        const rand = this.randomKey();
        // console.time(rand + '老人登录');

        // 老人登录
        let iRedBag = 0; // 立即红包
        // 查询没有领的现金红包
        // console.log('查询没有领的现金红包 开始',userId, new Date());
        // console.time(rand + '查询没有领的现金红包');
        let noPayRedBagMoney = await this.model('red_bag_log').where({
          is_pay: 0, app_user_id: userId, type: 4
        }).sum('money')
        noPayRedBagMoney = noPayRedBagMoney || 0;
        iRedBag = NP.plus(iRedBag, noPayRedBagMoney)
        // console.timeEnd(rand + '查询没有领的现金红包');
        // 查询助力表，找出一堆助力未登陆的人
        // console.time(rand + '找出一堆助力未登陆的人');
        const likeListMap = await this.model('like_log').where({
          app_user_id: userId, is_new_like_user: 1, is_like_user_login: 0
        }).select();
        // console.timeEnd(rand + '找出一堆助力未登陆的人');
        if (likeListMap.length > 0) {
          const likeUserIdListHash = {}
          likeListMap.forEach(i => {
            likeUserIdListHash[i.like_user_id] = i
          })

          // 查询是否已登录
          // console.time(rand + '查询是否已登录');
          const likeListString = likeListMap.map(i => i.like_user_id).join(',')
          // console.log('获取 签到数量 开始',userId, new Date());
          // console.timeEnd(rand + '查询是否已登录');

          // console.time(rand + '获取签到数量');
          // todo 是否锁表
          const signUserIdList = await this.getSignSituation(likeListString);
          // console.timeEnd(rand + '获取签到数量');
          // console.log('获取 签到数量 结束',userId, new Date());

          // 算红包 写记录
          // console.time(rand + '算红包写记录');
          const iRedBagList = []
          const create_date = think.datetime(new Date())
          signUserIdList.forEach(i => {
            // 立即红包
            const money = this.randomImmediateRedBag()
            const like_log_id = likeUserIdListHash[i].id
            iRedBagList.push({
              app_user_id: i, like_log_id, like_user_id: i,
              is_new_user: 1, type: 4, money: money, create_date
            })
            iRedBagList.push({
              app_user_id: userId, like_log_id, like_user_id: i,
              is_new_user: 0, type: 4, money: money, create_date
            })
            iRedBag = NP.plus(iRedBag, money)
          })
          // console.timeEnd(rand + '算红包写记录');

          if (u.is_expire === 0) {
            console.log('没过期')
            console.time(rand + '查看下一级红包是好多');
            const likedCount = await this.model('like_log').where({
              app_user_id: userId, is_new_like_user: 1, is_like_user_login: 1
            }).count()
            // 获取被助人信息
            // 查看下一级红包是好多
            // console.log('查看下一级红包是好多 开始',userId, new Date());
            const updateLikeList = []
            for (let index = 0; index < signUserIdList.length; index++) {
              const i = signUserIdList[index]
              const redBag = await this.getRedBagByLevel(u.money_level, likedCount + 1 + index);
              const like_log_id = likeUserIdListHash[i].id
              iRedBagList.push({
                app_user_id: userId, like_log_id, like_user_id: i,
                is_new_user: 0, type: 1, money: redBag, create_date
              })
              //
              updateLikeList.push({
                id: like_log_id,
                is_like_user_login: 1,
                like_user_login_date: think.datetime(new Date())
              })
            }
            // console.timeEnd(rand + '查看下一级红包是好多');
            // console.log('查看下一级红包是好多 结束',userId, new Date());
            // console.time(rand + '加红包记录表');
            if (iRedBagList.length > 0) {
              const addRedBagList = await this.model('red_bag_log').addMany(iRedBagList);
            }
            // console.timeEnd(rand + '加红包记录表');

            // console.time(rand + '修改助力表登录记录');
            if (updateLikeList.length > 0) {
              // 修改助力表登录记录 todo 优化
              // 添加助力统计 redis
              console.log('批量助力redis', userId, updateLikeList.length)
              await this.incSecKillCount(userId, updateLikeList.length)
              const updateLike = await this.model('like_log').updateMany(updateLikeList);
            }
            // console.timeEnd(rand + '修改助力表登录记录');
          } else {
            // 过期就不算等级红包
            console.log('过期')

            // 获取被助人信息
            // 查看下一级红包是好多
            // console.log('查看下一级红包是好多 开始',userId, new Date());
            const updateLikeList = []
            for (let index = 0; index < signUserIdList.length; index++) {
              const i = signUserIdList[index]
              const like_log_id = likeUserIdListHash[i].id

              updateLikeList.push({
                id: like_log_id,
                is_like_user_login: 1,
                like_user_login_date: think.datetime(new Date())
              })
            }
            // console.time(rand + '加红包记录表');
            if (iRedBagList.length > 0) {
              const addRedBagList = await this.model('red_bag_log').addMany(iRedBagList);
            }
            // console.timeEnd(rand + '加红包记录表');

            // console.time(rand + '修改助力表登录记录');
            if (updateLikeList.length > 0) {
              // 修改助力表登录记录
              // 添加助力统计3
              console.log('批量助力redis', userId, updateLikeList.length)
              await this.incSecKillCount(userId, updateLikeList.length)
              const updateLike = await this.model('like_log').updateMany(updateLikeList);
            }

          }
        }


        // 组织回复：
        // 重新看时间
        // console.time(rand + '重新看时间');
        const newLoginDateUser = await this.model('user').where({ app_user_id: userId }).find();
        // console.timeEnd(rand + '重新看时间');

        // console.time(rand + '计算过期时间');
        const redBagExpireDate = new Date(newLoginDateUser.login_date); // 计算过期时间
        let isExpire = false
        // 暂时不管这个u.is_expire
        if (u.is_expire === 0) {
          // if (true) {
          isExpire = this.calcIsExpire(redBagExpireDate);
          if (isExpire) {
            await this.model('user').where({ app_user_id: userId }).update({ is_expire: 1 })
          }
        } else {
          isExpire = true;
        }
        // console.timeEnd(rand + '计算过期时间');

        // console.time(rand + '计算签到状态');
        const signSituation = await this.calcSignSituation(userId);
        // console.timeEnd(rand + '计算签到状态');
        let canSign = signSituation.canSign; // 计算签到状态
        let signDate = signSituation.signDate; // 计算签到倒计时

        // console.time(rand + '计算秒杀次数');
        const secKillChanceSituation = await this.newCalcSecKillChance(userId); // 计算秒杀次数 注意上下限
        // console.timeEnd(rand + '计算秒杀次数');

        const secKillChance = secKillChanceSituation.chance;
        const likeAvatarList = secKillChanceSituation.likeAvatar
        let isOrderCar
        // console.log('x7订购情况 kaishi',userId, new Date());
        if (u.is_reserve_car === 0) {

          // console.time(rand + 'x7订购情况');
          const getReserveSituation = await this.getReserveSituation(userId); // x7订购情况
          // console.timeEnd(rand + 'x7订购情况');
          isOrderCar = getReserveSituation.isHave;// x7订购情况
          if (isOrderCar) {
            await this.model('user').where({ app_user_id: userId }).update({ is_reserve_car: 1 })
          }
        } else {
          isOrderCar = true;
        }
        // console.log('x7订购情况 jieshu',userId, new Date());
        // console.time(rand + '重新计算得到了多少红包');

        const calcCurrentRedBag = await this.calcCurrentRedBag(userId)
        const currentRedBag = this.mockD(this.fenToYuan(calcCurrentRedBag), 78) // 重新计算得到了多少红包 注意上下限
        // console.log(currentRedBag)
        // const currentRedBag = 0 // 测试环境
        // console.timeEnd(rand + '重新计算得到了多少红包');
        // iRedBag 立即红包
        // 测试环境
        iRedBag = this.fenToYuan(iRedBag)
        let isBindWeChat = false;
        if (!u.is_bind_we_chat) {
          const res = await this.isBindWeChat(userId);
          isBindWeChat = !!res.hasBind
        } else {
          isBindWeChat = true
        }
        // console.log('组织回复 结束',userId, new Date());
        const GetBigBag = await this.haveGetBigBag(userId); // 是否已领过大红包
        const haveGetBigBag = this.mockD(GetBigBag, true); // 是否已领过大红包
        const BigBagExpireDate = new Date((think.config('setup.REDBAG_EXPIRE_DATE'))); // 一阶段活动结束时间
        const data = {
          currentRedBag, redBagExpireDate, canSign, signDate, type: 2, isBindWeChat: isBindWeChat, BigBagExpireDate,
          secKillChance, isOrderCar, iRedBag, likeAvatarList, isExpire, shareId: u.uuid, haveGetBigBag,isEndTime
        }
        // console.timeEnd(rand + '老人登录');
        return { state: 'ok', data }
      }
    } else {
      // 如果没参加过活动
      // 分配首次红包
      const firstRedBag = await this.randomFirstRedBag();
      const first_money = firstRedBag.redBagNum;
      if (first_money === 0) {
        return { state: 'fail', msg: 'MONEY_ERROR' }
      }
      const money_level = firstRedBag.moneyLevel;
      const uuid = this.encodeUserId(userId);
      // 添加user表
      const addData = {
        app_user_id: userId,
        uuid,
        first_money,
        money_level,
        total_money: first_money,
        head_img: avatar,
        tel,
        is_new: 0,
        nick_name,
      }
      const addUser = await this.model('user').add(addData);
      // 写助力表
      // const likeData = {
      //   app_user_id: userId,
      //   tel: tel,
      //   is_new_like_user: 0,
      //   is_like_user_login: 1,
      //   like_user_login_date: think.datetime(new Date())
      // }
      // const addLike = await this.model('like_log').add(likeData)
      // 写红包表
      const redBagData = {
        app_user_id: userId,
        like_log_id: null,
        like_user_id: null,
        is_new_user: 0,
        type: 3,
        money: first_money
      }
      const redBag = await this.model('red_bag_log').add(redBagData)
      // 更新自己login_date，算红包过期时间用
      const updateUser = await this.model('user').where({ app_user_id: userId }).update({
        login_date: think.datetime(new Date())
      });
      const currentRedBag = this.fenToYuan(first_money) // 当前手气金额为首次红包
      const redBagExpireDate = new Date(); // 按写入首次红包的时间计算过期时间
      const canSign = true; // 签到状态可签到
      const signDate = -1; // 无签到倒计时
      const secKillChance = 0; // 秒杀数字为0
      const getReserveSituation = await this.getReserveSituation(userId); // x7订购情况
      const isOrderCar = getReserveSituation.isHave;// x7订购情况
      if (isOrderCar) {
        await this.model('user').where({ app_user_id: userId }).update({ is_reserve_car: 1 })
      }
      const iRedBag = 0;
      const likeAvatarList = [] // 助力头像
      // const isExpire = false;

      // const redBagExpireDate = new Date(); // 计算过期时间
      let isExpire = false
      // 暂时不管这个u.is_expire
      isExpire = this.calcIsExpire(redBagExpireDate);
      if (isExpire) {
        await this.model('user').where({ app_user_id: userId }).update({ is_expire: 1 })
      }

      let isBindWeChat = false;
      if (!u.is_bind_we_chat) {
        const res = await this.isBindWeChat(userId);
        isBindWeChat = !!res.hasBind
      } else {
        isBindWeChat = true
      }
      const haveGetBigBag = false; // 是否已领
      const BigBagExpireDate = new Date((think.config('setup.REDBAG_EXPIRE_DATE'))); // 一阶段活动结束时间
      const data = {
        currentRedBag, redBagExpireDate, canSign, signDate, type: 3, isBindWeChat, haveGetBigBag,isEndTime,
        secKillChance, isOrderCar, likeAvatarList, iRedBag, isExpire, shareId: uuid, BigBagExpireDate
      }
      return { state: 'ok', data }
    }
  }


  /**
   * 签到
   * @param userId
   * @returns {Promise<{}>}
   */
  async signPOST({}, { userId }) {
    if (!userId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const user = await this.model('user').where({ app_user_id: userId }).find();
    if (!user.id) {
      return { state: 'fail', msg: 'INVALID_USER' }
    }
    if (user.is_expire === 1) {
      // 过期不加签到值
      return { state: 'fail', msg: 'EXPIRE' }
    }
    const maxSignTime = think.config('setup.SIGN_MAX_NUM');
    const signCountWhere = `TO_DAYS( sign_date ) = TO_DAYS(now()) AND app_user_id = ${escapeString(userId)} `
    const signCount = await this.model('sign').where(signCountWhere).count();
    if (signCount >= maxSignTime) {
      return { state: 'fail', msg: 'MAX_SIGN' }
    }
    const signDate = new Date();
    const addData = {
      app_user_id: userId,
      sign_date: think.datetime(signDate)
    }
    const add = await this.model('sign').add(addData)
    const redBagData = {
      app_user_id: userId,
      type: 2,
      money: NP.times(think.config('setup.SIGN_MONEY'), 100)
    }
    const addRedBag = await this.model('red_bag_log').add(redBagData)
    return { state: 'ok', data: { signDate } }
  }

  /**
   * 查看红包状态
   * @returns {Promise<>}
   */
  async check_new_red_bagPOST({}, { userId }) {
    if (!userId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const newRedBag = await this.model('red_bag_log').where({ app_user_id: userId, is_view: 0 }).find();
    if (newRedBag.id) {
      return { state: 'ok', data: { haveNewRedBag: true } }
    } else {
      return { state: 'ok', data: { haveNewRedBag: false } }
    }
  }

  async set_new_red_bag_statePOST({}, { userId }) {
    if (!userId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const newRedBag = await this.model('red_bag_log').where({ app_user_id: userId, is_view: 0 }).update({
      is_view: 1
    });
    if (newRedBag.id) {
      return { state: 'ok', data: {} }
    } else {
      return { state: 'ok', msg: {} }
    }
  }

  /**
   * 轮询请求 总金额
   * @returns {Promise<void>}
   */
  async total_moneyPOST() {
    const totalMoney = await this.totalMoney();
    return { state: 'ok', data: { totalMoney: totalMoney.totalMoney } }
  }

  /**
   * 待提红包列表
   * @returns {Promise<{}>}
   */
  async wait_get_red_bag_listPOST({}, { userId }) {
    if (!userId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const sql = `SELECT r.type, r.money, r.create_date, u.tel
      FROM \`red_bag_log\` as r LEFT JOIN \`user\` as u on r.like_user_id = u.app_user_id
      WHERE r.type != 4  AND r.app_user_id = ${escapeString(userId)}`
    const list = await this.model('red_bag_log').query(sql);
    const res = list.map(i => {
      i.tel = this.formatPhone(i.tel)
      i.money = this.fenToYuan(i.money)
      return i
    })
    return { state: 'ok', data: res }
  }

  /**
   * 邀约红包列表
   * @returns {Promise<{}>}
   */
  async invite_red_bag_listPOST({}, { userId }) {
    if (!userId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const sql = `SELECT r.is_pay, r.money, r.create_date, u.tel
      FROM \`red_bag_log\` as r LEFT JOIN \`user\` as u on r.like_user_id = u.app_user_id
      WHERE r.type = 4  AND r.app_user_id = ${escapeString(userId)}`
    const list = await this.model('red_bag_log').query(sql);
    let iRedBag = 0;
    const res = list.map(i => {
      if (i.is_pay === 0) {
        iRedBag = NP.plus(iRedBag, i.money)
      }
      i.tel = this.formatPhone(i.tel)
      i.money = this.fenToYuan(i.money)

      return i
    })
    iRedBag = this.fenToYuan(iRedBag)
    return { state: 'ok', data: { list: res, iRedBag: iRedBag } }
  }

  /**
   * 邀请记录
   * @returns {Promise<{}>}
   */
  async invite_log_listPOST({}, { userId }) {
    if (!userId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const where = { app_user_id: userId }
    const field = 'tel, create_date, like_user_login_date'
    const list = await this.model('like_log').field(field).where(where).select();
    const res = list.map(i => {
      i.tel = this.formatPhone(i.tel)
      return i
    })
    return { state: 'ok', data: res }
  }


  /**
   * 统计日志收取
   * @param typeId
   * @param userId
   * @returns {Promise<{msg: string, state: string}>}
   */
  async visit_logPOST({}, { typeId, userId }) {
    if (!userId || !typeId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    await this.model('visit_log').add({
      visit_type_id: typeId,
      app_user_id: userId,
      visit_date: think.datetime(new Date())
    })
    return { state: 'ok' }
  }

  /**
   * 统计日志收取
   * @param typeId
   * @param userId
   * @returns {Promise<{msg: string, state: string}>}
   */
  async visit_log_by_linkPOST({}, { typeId, userHash }) {
    if (!userHash || !typeId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const userId = this.deCodeUserId(userHash)
    await this.model('visit_log').add({
      visit_type_id: typeId,
      app_user_id: userId,
      visit_date: think.datetime(new Date())
    })
    return { state: 'ok' }
  }

  /**
   * 是否有领过大红包
   * @param userId
   * @returns {Promise<boolean>}
   */
  async haveGetBigBag(userId) {
    const bigBagList = await this.model('red_bag_pay_log').where({
      app_user_id: userId, level: ['!=', 4], have_pay: 1
    }).select();
    return bigBagList.length > 0
  }

  /**
   * 计算虚拟红包值
   * @param userId
   * @returns {Promise<*>}
   */
  async calcCurrentRedBag(userId) {
    const res = await this.model('red_bag_log').where({
      type: ['!=', 4], app_user_id: userId
    }).sum('money');
    return res || 0;
  }

  /**
   * 计算秒杀次数
   * @param userId
   * @returns {Promise<*>}
   */
  async calcSecKillChance(userId) {
    const count = await this.model('like_log').where({
      app_user_id: userId, is_new_like_user: 1, is_like_user_login: 1
    }).count()
    let likeAvatar = []
    if (count > 0) {
      const likeIdList = await this.model('like_log').field('like_user_id').where({
        app_user_id: userId, is_new_like_user: 1, is_like_user_login: 1
      }).order('like_user_login_date DESC').limit(2).select();
      const ids = likeIdList.map(i => i.like_user_id)
      if (ids.length > 0) {
        const userList = await this.model('user').field('head_img').where({ app_user_id: ['in', ids] }).select();
        // console.log('count', ids)
        likeAvatar = userList.map(i => i.head_img)
      }

    }

    // 每两人加一次机会, 注意有上限
    let chance = Math.floor(count / 2)
    chance = chance > parseInt(think.config('setup.SECKILL_DURATION_TIME')) ? parseInt(think.config('setup.SECKILL_DURATION_TIME')) : chance

    return { chance, count, likeAvatar }
  }

  /**
   * 新版计算
   * @returns {Promise<*>}
   */
  async newCalcSecKillChance(userId) {
    const u = await this.model('user_assist').where({ id: userId }).find()
    let likeAvatar = [], count = 0, chance = 0
    if (u.id) {
      count = u.total_sec_kill_count;
      const sql = `SELECT head_img from ( SELECT like_user_id FROM like_log WHERE app_user_id = ${userId} AND is_new_like_user = 1 AND is_like_user_login = 1 ORDER BY modify_date ASC LIMIT 2 ) AS l
 LEFT JOIN \`user\` AS u ON u.app_user_id = l.like_user_id`
      const userList = await this.model('user_assist').query(sql)
      likeAvatar = userList.map(i => i.head_img)
      let totalChance = Math.floor(count / 2)
      const dayCorrectionCount = u.day_correction_count; // 修正天数
      // const dayDiff = await this.calcDayDiff() // 过去了多少天
      const usedActionCount = await this.calcUsedActionCount() // 过去了多少场次
      let todayUse = 0
      const isTodayUse = await GRedis.get(`SECKILL_GOODS_USER_QUALIFIED:${think.datetime(new Date(), 'YYYYMMDD')}:${userId}`)
      if (isTodayUse) {
        todayUse = 1
      }
      // 总机会 + 修正值 - 距离开始日期多少场 - 今天是否有没有使用机会
      chance = totalChance + dayCorrectionCount - usedActionCount - todayUse

      // 最大机会值 =  SECKILL_DURATION_TIME 现在是6 - 距离开始日期多少场
      const MAXTime = parseInt(think.config('setup.SECKILL_DURATION_TIME')) - usedActionCount
      console.log('chance', totalChance, dayCorrectionCount, usedActionCount, todayUse, MAXTime)
      chance = chance > MAXTime ? MAXTime : chance < 0 ? 0 : chance
    }

    return { chance, count, likeAvatar }
  }


  /**
   * 计算签到倒计时
   * @returns {Promise<{}>}
   */
  async calcSignSituation(userId) {
    let canSign = true; // 计算签到状态
    let signDate = -1; // 计算签到倒计时

    const maxSignTime = think.config('setup.SIGN_MAX_NUM');
    const signCountWhere = `TO_DAYS( sign_date ) = TO_DAYS(now()) AND app_user_id = ${escapeString(userId)} `
    const signCount = await this.model('sign').where(signCountWhere).count();
    if (signCount >= maxSignTime) {
      return { canSign: false, signDate: -1 }
    }
    const sign = await this.model('sign').where({ app_user_id: userId }).order('sign_date DESC').find();
    if (sign.id) {
      signDate = new Date(sign.sign_date)
      const interval = (new Date()) - signDate;
      // 间隔1小时
      if (interval > 3600 * 1000) {
        signDate = -1
      } else {
        canSign = false
      }
    }
    return { canSign, signDate }
  }

  /**
   * 计算是否过期
   * @param date
   */
  calcIsExpire(date) {
    // 算法1 按登录时间加小时
    // const expireHour = parseInt(think.config('setup.REDBAG_EXPIRE_HOUR'))
    // const now = new Date();
    // return now - date > expireHour * 3600 * 1000

    // 算法2 按截至时间
    const expireDate = new Date((think.config('setup.REDBAG_EXPIRE_DATE'))) || '2019-10-07 23:59:59'
    const now = new Date();
    return now >= expireDate
  }

  /**
   * 计算总金额
   * @returns {Promise<>}
   */
  async totalMoney() {
    const startTimeString = think.config('setup.START_TIME')
    const startTime = new Date(startTimeString);
    const now = new Date();
    const baseMoney = parseInt(think.config('setup.TOTAL_REDBAG_BASE'));
    const growInterval = parseInt(think.config('setup.BASE_GROW_INTERVAL')); // 秒
    const growNumber = parseInt(think.config('setup.BASE_GROW_NUM'));
    const baseTotalMoney = Math.round((now - startTime) / 1000 / growInterval) * growNumber + baseMoney;
    let realTotalMoney = await this.model('pay_log').where('1=1').sum('amount');
    realTotalMoney = realTotalMoney || 0;
    const totalMoney = this.fenToYuan(baseTotalMoney * 100 + realTotalMoney)
    return { realTotalMoney: this.fenToYuan(realTotalMoney), baseTotalMoney, totalMoney }
  }

  /**
   * 获取分享列表
   * @returns {Promise<>}
   */
  async shareContent() {
    const content = await this.model('share_content').where('1=1').select();
    const inviteList = []
    const showList = []
    content.forEach(i => {
      i.type === 1 ? inviteList.push(i) : showList.push(i)
    })
    return { inviteList, showList }

  }

  /**
   * 晒单列表
   * @returns {Promise<>}
   */
  async showMoneyList() {
    const isShowMock = think.config('setup.IS_SHOW_PRIZE') === '1';
    if (isShowMock) {
      const listMap = await this.model('show_prize_log').field('head_img,nickname,tel,money').where('1=1').select();
      return listMap
    } else {
      const limit = 20
      const sql = `SELECT b.app_user_id, b.money, u.tel, u.nick_name, u.head_img FROM \`red_bag_pay_log\` as b 
      LEFT JOIN \`user\` as u ON\tu.app_user_id = b.app_user_id WHERE (b.level = 1 or b.level= 2) and u.nick_name is not null 
      ORDER BY b.pay_date DESC LIMIT ${limit} `
      const listMap = await this.model('show_prize_log').query(sql)
      return listMap.map(i => {
        const nickName = i.nick_name ? this.trimUserName(i.nick_name, 5) : '匿名车友'
        const head_img = i.head_img || 'http://head'
        return { head_img, nickname: nickName, tel: this.formatPhone(i.tel), money: this.fenToYuan(i.money) }
      })
    }
  }

  /**
   * 切名字
   * @param item
   * @param length 这个大概是指有几个中文字符的宽度，4个中文宽可以当8个英文
   * @returns {string}
   */
  trimUserName(item, length) {
    const len = this.calcStringLengthForTrim(item, length)
    return item.slice(0, len);
  }

  /**
   * 计算用来切的字符长度
   * @returns {number}
   */
  calcStringLengthForTrim(item, length) {
    let len = 0;
    let l = length * 2
    for (let i = 0; i < item.length; i++) {
      if (item.charCodeAt(i) > 127 || item.charCodeAt(i) === 94) {
        len += 2;
      } else {
        len += 1;
      }
      if (len > l) {
        return i
      }
    }
    return length;
  }


  /**
   * 随机生成立即红包
   * @returns number}
   */
  randomImmediateRedBag() {
    const min = this.yuanToFen(think.config('setup.IMMEDIATE_REDBAG_LOW'))
    const max = this.yuanToFen(think.config('setup.IMMEDIATE_REDBAG_HIGH'))
    return this.getRandomIntInclusive(min, max);
  }

  /**
   * 随机抽取首次红包
   * @returns {Promise<{}>}
   */
  async randomFirstRedBag() {
    // return { redBagNum: 5888, money_level: 1 } // 假发
    const redBagList = await this.model('like_rule').where('1=1').select();
    const len = redBagList.length;
    let randomNum
    if (len > 0) {
      randomNum = this.getRandomIntInclusive(0, len - 1);
      const redbag = redBagList[randomNum]
      const redBagNum = redbag.first_money + this.getRandomIntInclusive(0, 99);
      const moneyLevel = redbag.level;
      return { redBagNum, moneyLevel } // 真发
    } else {
      return { redBagNum: 0, moneyLevel: 0 } //
    }
  }

  /**
   * 根据等级获取对应红包
   * @param mainLevel
   * @param subLevel
   * @returns {Promise<number|*>}
   */
  async getRedBagByLevel(mainLevel, subLevel) {
    const ruleList = await this.model('like_rule').getSet();
    const rule = ruleList[mainLevel]
    if (rule.id) {
      const subRule = JSON.parse(rule.other_rule)
      const subRuleList = subRule.moreRule;

      const len = subRuleList.length;
      if (len >= subLevel) {
        return subRuleList[subLevel - 1]
      } else {
        return subRule.other
      }

    } else {
      return 0
    }

  }

  /**
   * 请求查询微信绑定情况
   * @param userId
   * @returns {Promise<>}
   */
  async is_bind_we_chatPOST({}, { userId }) {
    if (!userId) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const res = await this.isBindWeChat(userId);
    if (res.hasBind) {
      await this.model('user').where({ app_user_id: userId }).update({ is_bind_we_chat: 1 });
      return { state: 'ok', data: { hasBind: true } }
    } else {
      return { state: 'ok', data: { hasBind: false } }
    }
  }


  /**
   * 调用接口查看微信绑定情况
   * @param userId
   * @returns {Promise<{}>}
   */
  async isBindWeChat(userId) {
    const appService = this.service('app')
    const app = new appService()
    const getHasBind = await app.getHasBind(userId)
    if (getHasBind.code === 0) {
      return getHasBind.data;
    } else {
      return {}
    }
  }

  /**
   * 调用app接口登录(返回userId)，再调用签到接口。判断是新人还是老人。
   * @returns {Promise<*>}
   */
  async loginAndCheck(tel, code) {
    const appService = this.service('app')
    const app = new appService()
    const sendLoginCode = await app.login(tel, code)
    // console.log(sendLoginCode)
    if (sendLoginCode.code === 0) {
      const loginData = JSON.parse(sendLoginCode.data);
      // 用户信息
      const getUserInfo = await app.getUserInfo(loginData.token)
      // console.log(getUserInfo)
      if (getUserInfo.code === 0) {
        const userInfo = getUserInfo.data;
        const userId = userInfo.userId;
        const nickname = userInfo.nickname
        // 查看签到
        const isUserSignIn = await app.isUserSignIn(userId, nickname, think.datetime(new Date('2018-04-01 00:00:00')))
        // console.log(isUserSignIn)
        if (isUserSignIn.code === 0) {
          const userSignCount = isUserSignIn.data.counts;
          return { state: 'ok', data: { avatar: userInfo.avatar, userId, isUserSignIn: userSignCount > 0 } }
        } else {
          return { state: 'fail', msg: 'CHECK_SIGN_ERROR' }
        }
      } else {
        return { state: 'fail', msg: 'USER_INFO_ERROR' }
      }
    } else {
      return { state: 'fail', msg: 'NO_CHECK' }
    }
  }

  /**
   * 调用接口查看x7订购情况
   * @param userId
   * @returns {Promise<{}>}
   */
  async getReserveSituation(userId) {
    // return { isHave: false } // 假发
    const appService = this.service('app')
    const app = new appService()
    const getReserveSituation = await app.getReserveSituation(userId)
    if (getReserveSituation.code === 0) {
      return getReserveSituation.data;
    } else {
      return {}
    }
  }

  /**
   *
   * @param tel
   * @param code
   * @returns {Promise<{}>} data.token, data.isNewRegister
   */
  async appLogin(tel, code) {
    const appService = this.service('app')
    const app = new appService()
    const sendLoginCode = await app.login(tel, code)
    if (sendLoginCode.code === 0) {
      return JSON.parse(sendLoginCode.data);
    } else {
      return {}
    }
  }

  /**
   * 根据token获取用户信息
   * @param token
   * @returns {Promise<{}|*>}
   */
  async getUserInfo(token) {
    const appService = this.service('app')
    const app = new appService()
    const getUserInfo = await app.getUserInfo(token)
    if (getUserInfo.code === 0) {
      return getUserInfo.data;
    } else {
      return {}
    }
  }

  /**
   * 获取签到情况
   * @returns {Promise<{}|*>}
   */
  async getSignSituation(userIdString) {
    const appService = this.service('app')
    const app = new appService()
    const getSign = await app.getSign(userIdString)
    if (getSign.code === 0) {
      return getSign.data.filter(i => i.sign).map(i => i.userId);
    } else {
      return {}
    }
  }

  /**
   * 注册用户写入数据
   * @returns {Promise<*>}
   */
  async registerUser() {
    return this.encodeUserId(12)
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

  /**
   * 用户信息接口uuid
   * @returns {Promise<*>}
   */
  async user_info_uuidGET({ uuid }) {
    if (!uuid) {
      return { state: 'fail' }
    }
    const userId = this.deCodeUserId(uuid)
    if (userId.length !== 1) {
      return { state: 'fail', msg: 'INVALID_UUID' }
    }
    const user = await this.userInfo(userId[0])
    if (user.id) {
      const res = {}
      return { state: 'fail', data: { user } }
    } else {
      return { state: 'fail' }
    }
  }

  /**
   * 用户信息接口
   * @returns {Promise<*>}
   */
  async user_infoGET({ userId }) {
    if (!userId) {
      return { state: 'fail' }
    }
    const user = await this.userInfo(userId)
    if (user.id) {
      const res = {}
      return { state: 'fail', data: { user: res } }
    } else {
      return { state: 'fail' }
    }
  }

  async userInfo(app_user_id) {
    return await this.model('user').where({ app_user_id }).find();
  }

  async show_user_infoPOST({}, { uuid }) {
    // 前置验证
    if (!uuid) {
      return { state: 'fail', msg: 'INVALID_POST' }
    }
    const decode = this.deCodeUserId(uuid)
    if (decode && decode.length === 0) {
      return { state: 'fail', msg: 'INVALID_USER_UID' }
    }
    const app_user_id = decode[0];
    const user = await this.model('user').where({ app_user_id }).find();
    if (!user.id) {
      return { state: 'fail', msg: 'INVALID_USER' }
    }
  }

  /**
   * 隐藏手机号码中间4位
   * @param phone
   * @returns {void | string | never}
   */
  formatPhone(phone) {
    if (phone) {
      return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    }
    return phone
  }


  /**
   * 获取任意整数范围内的随机数，包括min和max
   * 不包括
   * @param min
   * @param max
   * @returns {*}
   */
  getRandomIntInclusive(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * 同步到子表
   * @param pass
   * @returns {Promise<*>}
   */
  async sync_u_aPOST({}, { pass }) {
    if (pass !== 'sdoihfa&@') {
      return 20
    }
    // await this.syncMockUserPipeLine()
    await this.syncUserAssistDataPipeLine()
    return { msg: 'ok' }
  }

  /**
   * 同步用户子表内容到redis
   * @returns {Promise<number>}
   */
  async syncUserAssistData() {
    const data = await this.model('user_assist').select()
    for (let i = 0; i < data.length; i++) {
      let t = data[i];
      await GRedis.incrby('SEC_KILL_TOTAL_COUNT:' + t.id, t.total_sec_kill_count);
      // console.log(i)
    }
    return 1
  }

  /**
   * 同步用户子表内容到redis的pipeline版本
   * @returns {Promise<number>}
   */
  async syncUserAssistDataPipeLine() {
    const data = await this.model('user_assist').select()
    const pipeData = []
    for (let i = 0; i < data.length; i++) {
      let t = data[i];
      pipeData.push(['incrby', 'SEC_KILL_TOTAL_COUNT:' + t.id, t.total_sec_kill_count])
    }
    const pipe = await GRedis.pipeline(pipeData).exec()
    return pipe
  }

  /**
   * 同步虚拟用户到reids
   * @returns {Promise<number>}
   */
  async syncMockUserPipeLine() {
    const data = await this.model('show_prize_log').select()
    const pipeData = []
    for (let i = 0; i < data.length; i++) {
      let t = data[i];
      let addData = { nickname: t.nickname, tel: t.tel, head_img: t.head_img }
      pipeData.push(['hset', 'SEC_KILL_MOCK_USER', t.id, JSON.stringify(addData)])
    }
    const pipe = await GRedis.pipeline(pipeData).exec()
    return pipe
  }

  async syncUserKillCount() {
    const data = await this.model('user_assist').select()
    const pipeData = []
    for (let i = 0; i < data.length; i++) {
      let t = data[i];
      pipeData.push(['set', 'SEC_KILL_TOTAL_COUNT:' + t.id, Math.floor(t.total_sec_kill_count / 2) + t.day_correction_count])
    }
    const pipe = await GRedis.pipeline(pipeData).exec()
    return pipe
  }

  /**
   * 增加秒杀次数记录
   * @returns {Promise<void>}
   */
  async incSecKillCount(appUserId, number) {
    const u = await this.model('user_assist').where({ id: appUserId }).find()
    const totalShareCount = u.total_sec_kill_count || 0;
    const dayCorrectionCount = u.day_correction_count || 0
    const killCount = Math.floor((totalShareCount + number) / 2)
    console.log('killcount', killCount, totalShareCount, number, dayCorrectionCount)
    const sqlString = `INSERT INTO user_assist (id,total_sec_kill_count,pay_sec_kill_count) VALUES 
    (${appUserId},${number},0) ON DUPLICATE KEY UPDATE total_sec_kill_count=total_sec_kill_count+${number}`
    const add = await this.model('user_assist').query(sqlString)
    if (add && add.affectedRows > 0) {
      // 更新 redis
      try {
        const count = await GRedis.get('SEC_KILL_TOTAL_COUNT:' + appUserId);
        console.log('redis get count', count)
        if (!count) {
          // 计算这个人是在秒杀开始多少天来的
          // const dayDiff = await this.calcDayDiff();
          // 计算这个人是在秒杀开始之前过去了多少场
          const usedActionCount = await this.calcUsedActionCount() // 过去了多少场次
          if (usedActionCount >= 0) {
            console.log('add new redis count', appUserId, killCount)
            await this.model('user_assist').where({ id: appUserId }).update({ day_correction_count: usedActionCount })
            await GRedis.set('SEC_KILL_TOTAL_COUNT:' + appUserId, usedActionCount + killCount);
          }
        } else {
          console.log('add old redis count', appUserId, number)
          await GRedis.set('SEC_KILL_TOTAL_COUNT:' + appUserId, killCount + dayCorrectionCount);
        }
      } catch (err) {

      }

    }

  }

  /**
   * 计算过去了多少场次
   * @returns {Promise<*>}
   */
  async calcUsedActionCount() {
    const todayNumber = think.datetime(new Date(), 'YYYYMMDD')
    const usedActionList = await GRedis.zrangebyscore('SECKILL_COLLECTION_LISTS', 0, todayNumber)
    return usedActionList.filter(i => i !== todayNumber).length
  }

  /**
   * 计算时间差额
   * @returns {Promise<number>}
   */
  async calcDayDiff() {
    const startDateString = await GRedis.get('SEC_KILL_SETUP:START_DATE');
    const startDate = (new Date(startDateString))
    const now = new Date()
    const res = Math.floor((now - startDate) / (24 * 3600 * 1000));
    return res < 0 ? 0 : res
  }

}
