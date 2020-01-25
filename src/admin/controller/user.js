'use strict'

import Base from './baseRest.js'

const xml2js = require('xml2js')
const request = require('superagent')
const soap = require('soap')
const jwt = require('jsonwebtoken');

export default class extends Base {

  userModel = this.model('user')
  prizeLogModel = this.model('prize_log')
  orderLogModel = this.model('order_log')

  async indexGET() {
    return { 'page': 'admin user' }
  }

  /**
   * admin数据
   * @param id
   * @returns {*}
   */
  async infoGET({ token }) {
    const decoded = jwt.decode(token, { complete: true });
    const admin = await this.model('admin_user').where({ id: decoded.payload.uid }).find();
    let adminInfo;
    if(admin.status == 0 ) {
      this.json({ code: 50000, message: '帐号无法使用' })
      return this.end();
    }
    admin.user_type = admin.type === 0 ? ['admin'] : ['editor'];
    if (admin) {
      adminInfo = {
        role: admin.user_type,
        token: token,
        introduction: '我是' + admin.name,
        avatar: 'http://oivwn7sjt.bkt.clouddn.com/user.png',
        name: admin.account,
        uid: admin.user_id
      }
    }
    return adminInfo;

  }

  /**
   * 测试xml请求用
   * @param get
   * @param post
   * @return {Promise.<*>}
   */
  async testreqPOST(get, post) {

    if (think.env !== 'development') {
      return { state: 'fail', msg: 'no_develop' }
    }
    const offerCompIds = { '100m': '1046', '500m': '1049', '1g': '1050' }

    // console.log(await this.http.getPayload())
    const transactionId = this.transactionId()
    const channel_id = 1
    const password = 'F7DC92858B741132FDA3'
    const acc_nbr = '17384096366'
    const c_product_id = '208511296'
    const buss_id = '10047'
    const con_id = '1200'
    const sale_type = 'A'
    const offerCompId = '1099'
    const newFlag = 'F'
    const accept_type = 1
    const accept_mode = 1
    const stimeFlag = 0

    const resultObj = {
      Root: {
        Header: {
          transactionId: transactionId,
          channel_id: channel_id,
          password: password
        },
        DataParam: {
          acc_nbr: acc_nbr,
          c_product_id: c_product_id,
          buss_id: buss_id,
          con_id: con_id,
          sale_type: sale_type,
          offerCompId: offerCompId,
          newFlag: newFlag,
          accept_type: accept_type,
          accept_mode: accept_mode,
          stimeFlag: stimeFlag
        }
      }
    }
    const xmlBuilder = new xml2js.Builder()
    const resultXML = xmlBuilder.buildObject(resultObj) // 对象转xml

    // 给接口服务器发xml请求
    // const url = 'http://localhost/serverchktwish/admin/user/testreq'
    const url = 'http://dls.cq.ct10000.com/external/services/TrafficAcceptService'
    const type = 'xml'
    let result = ''
    try {
      result = await request.post(url).buffer().set(header).type(type).send(resultXML)
      console.log(result.text)
    } catch (err) {
      console.log('err', err.status, err.response.text)
      result = err.response
    }

    // 把接口返回xml转成对象
    const parser = new xml2js.Parser()
    const xmlParsePromise = think.promisify(parser.parseString, parser)
    const resultOjb = await xmlParsePromise(result.text)
    // console.log(resultOjb.Root.Header)

    this.type('application/xml')
    this.write(resultXML)
    this.end()
  }

  /**
   * soap请求-电信对接-测试
   * @param get
   * @param post
   * @return {Promise.<*>}
   */
  async tel_soap_reqPOST(get, post) {
    if (think.env !== 'development') {
      return { state: 'fail', msg: 'no_develop' }
    }
    const tel = '17384096366x'
    const chargeName = '100m'
    const userId = 1
    const prizeLogId = 30
    const result = await this.telSoap(tel, chargeName, userId, prizeLogId)
    return result
  }

  /**
   * soap请求-电信对接
   * @param tel
   * @param chargeName
   * @param userId
   * @param prizeLogId
   * @return {Promise.<*>}
   */
  async telSoap(tel, chargeName, userId, prizeLogId) {
    const offerCompIds = { '100m': '1046', '500m': '1049', '1g': '1050' }
    const transactionId = this.transactionId()
    const channel_id = 1
    const password = 'F7DC92858B741132FDA3'
    const acc_nbr = tel
    const c_product_id = '208511296'
    const buss_id = '10047'
    const con_id = '1200'
    const sale_type = 'A'
    const offerCompId = offerCompIds[chargeName]
    const newFlag = 'F'
    const accept_type = 1
    const accept_mode = 1
    const stimeFlag = 0

    const resultObj = {
      Root: {
        Header: {
          transactionId: transactionId,
          channel_id: channel_id,
          password: password
        },
        DataParam: {
          acc_nbr: acc_nbr,
          c_product_id: c_product_id,
          buss_id: buss_id,
          con_id: con_id,
          sale_type: sale_type,
          offerCompId: offerCompId,
          newFlag: newFlag,
          accept_type: accept_type,
          accept_mode: accept_mode,
          stimeFlag: stimeFlag
        }
      }
    }
    console.log('chargRequest', JSON.stringify(resultObj))

    const xmlBuilder = new xml2js.Builder()
    const resultXML = xmlBuilder.buildObject(resultObj) // 对象转xml

    // soap模块
    const url = 'http://dls.cq.ct10000.com/external/services/TrafficAcceptService?wsdl'
    const args = { in0: '<![CDATA[' + resultXML + ']]>' }
    let that = this
    const client = await soap.createClientAsync(url)
    client.setEndpoint('http://dls.cq.ct10000.com/external/services/TrafficAcceptService')
    const result = await client.exchageAsync(args)
    const parser = new xml2js.Parser({ explicitArray: false })
    const xmlParsePromise = think.promisify(parser.parseString, parser)
    const exchageReturn = await xmlParsePromise(result.exchageReturn)
    console.log('chargeResult', JSON.stringify(exchageReturn))
    if (exchageReturn && exchageReturn.Root && exchageReturn.Root.Header) {
      //  "ExchangeId": "CQFS2018012717571924455721","Code": "-10006","Message": "请使用电信号码"
      const result = exchageReturn.Root.Header
      if (result.Code === '0000') {
        // 成功
        const orderContent = exchageReturn.Root.Results
        const addData = {
          exchangeid: result.ExchangeId,
          acceptid: orderContent.AcceptId,
          acceptedtime: orderContent.AcceptedTime,
          specname: orderContent.SpecName,
          cust_id: orderContent.Cust_id,
          objecttype: orderContent.ObjectType,
          orderid: orderContent.OrderId,
          servcodename: orderContent.ServCodeName,
          user_id: userId,
          prize_log_id: prizeLogId
        }
        const addOrderLog = await this.orderLogModel.add(addData)
        return this.successReq({ state: 'ok' })
      } else if (result.Code === '-10006') {
        // 号码不对
        return this.successReq({ state: 'fail', msg: 'wrong_number' })
      } else {
        return this.successReq({ state: 'fail', msg: result.Message })
      }
    } else {
      // 提交失败
      return this.successReq({ state: 'fail', msg: 'request_error' })
    }

  }

  /**
   * 电信对接生成id
   */
  transactionId() {
    // CQFS+8位日期yyyyMMddHHmmss(例如:20151108141558）+8位随机码（例如：12345678）
    let id = 'CQFS'
    const now = new Date()
    const Y = now.getFullYear()
    const M = (now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1)
    const D = now.getDate() < 10 ? '0' + now.getDate() : now.getDate()
    const h = now.getHours() < 10 ? '0' + now.getHours() : now.getHours()
    const m = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()
    const s = now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()
    let randNum = ''
    for (let i = 0; i < 8; i++) {
      randNum += this.getRandomIntInclusive(0, 9)
    }

    return id + Y + M + D + h + m + s + randNum

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
   * 流量兑奖
   * @param user_id
   * @param code
   * @param prize_log_id
   * @param tel
   * @return {Promise.<*>}
   */
  async code_to_prizeGET({ user_id, code, prize_log_id, tel }) {
    if (!user_id || !code || !prize_log_id || !tel) {
      return this.successReq({ state: 'fail', msg: 'invalid_param' })
    }
    const mPattern = /^1[345789]\d{9}$/
    if (!mPattern.test(tel)) {
      return this.successReq({ state: 'fail', msg: 'invalid_tel' })
    }

    const prizeWhere = { id: prize_log_id, user_id, prize_code: code, }
    const prize = await this.prizeLogModel.where(prizeWhere).find()
    if (!prize.id) {
      return this.successReq({ state: 'fail', msg: 'invalid_prize' })
    }
    if (prize.type !== 1) {
      return this.successReq({ state: 'fail', msg: 'invalid_prize_type' })
    }

    if (prize.is_register === 1) {
      return this.successReq({ state: 'fail', msg: 'already_prize' })
    }
    // 加锁
    const prizeVersion = await this.userLock(user_id, 'charge_prize_version')
    if (prizeVersion == 0) {
      return { state: 'fail', msg: 'more_request' }
    }

    const prizeTable = {
      '500M流量包': '500m',
      '100M流量包': '100m',
      '1G流量包': '1g'
    }

    // 兑流量奖
    const chargeName = prizeTable[prize.prize_level]
    // const requestPrize = await this.telSoap(tel, chargeName, user_id, prize_log_id);
    const requestPrize = { data: { state: 'ok' } }

    if (requestPrize.data && requestPrize.data.state == 'fail') {
      // 清锁
      await this.userClearLock(user_id, 'charge_prize_version')
      return this.successReq({ state: 'fail', msg: requestPrize.data.msg })
    }

    const update = await this.prizeLogModel.where({ id: prize_log_id }).update({ is_register: 1 })
    if (update) {
      // 清锁
      await this.userClearLock(user_id, 'charge_prize_version')
      return this.successReq({ state: 'ok' })
    } else {
      // 清锁
      await this.userClearLock(user_id, 'charge_prize_version')
      return this.successReq({ state: 'fail', msg: 'update_error' })
    }
  }

  /**
   * 返回前端所需rest格式的内容
   * @param obj
   * @return {{code: number, msg: string, data: *}}
   */
  successReq(obj) {
    return { code: 0, msg: '', 'data': obj }
  }


  /**
   * 添加乐观锁
   * @param id
   * @param fieldName
   * @return {Promise.<*>}
   */
  async userLock(id, fieldName) {
    const where = {}, update = {}
    where.id = id
    where[fieldName] = 0
    update[fieldName] = 1
    return await this.userModel.where(where).update(update)
  }

  /**
   * 清除乐观锁
   * @param id
   * @param fieldName
   * @return {Promise.<*>}
   */
  async userClearLock(id, fieldName) {
    const where = {}, update = {}
    where.id = id
    where[fieldName] = 1
    update[fieldName] = 0
    return await this.userModel.where(where).update(update)
  }



}
