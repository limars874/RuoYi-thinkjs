'use strict'

export default class extends think.controller.rest {

  /**
   * some base method in here
   */

  __call() {
    console.log('call is ' + this.http.method)
    let method = this.http.method.toLowerCase()
    //this.setCorsHeader();
    //console.log(this.http.headers['access-control-request-method']) ;
    if (method === 'options') {
      console.log('options')
      this.end()
      return
    }

    console.log('callll')
    return super.__call()
  }

  setCorsHeader() {
    this.header('Access-Control-Allow-Origin', '*')
    this.header('Access-Control-Allow-Headers', 'x-requested-with,X-Token,Content-Type,x-page-href')
    this.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,DELETE')
    this.header('Access-Control-Allow-Credentials', 'true')
  }

  failByCode(code) {
    return super.fail(code, showErrooByCode(code), {})
  }

  /**
   * 获取用户信息
   */
  //async userInfo() {
  //	let _debug = think.config('_DEBUG_')
  //	let debuguserid  = 1
  //	if(_debug){
  //		let user = await this.model('user').where({id:debuguserid}).find()
  //		return user
  //	}
  //	let USER_LOGIN_KEY = think.config('USER_LOGIN_KEY')
  //	let userid = await this.session(USER_LOGIN_KEY)
  //	if(think.isEmpty(userid)){
  //		throw 30000
  //	}
  //	let user = await this.model('user').where({id:userid}).find()
  //	if(!user.id){
  //		throw 30000
  //	}
  //	return user
  //}

  async __before() {
    //let {module,controller,action} = this.http
    //let reqUrl = `${module}/${controller}/${this.id}${action.toUpperCase()}`
    //think.debugLog('请求action: '  + reqUrl,'red')
    //let whiteActions = think.config('white_actions')
    //try{
    //	let userinfo = await this.userInfo()
    //	this.userinfo = userinfo
    //}catch(e){
    //	if(whiteActions.indexOf(reqUrl) < 0){
    //		//产生授权信息
    //		let realUrl = this.header('x-page-href')
    //		let wechatService =  this.service('wechat')
    //		let wechat  = new wechatService()
    //		let oauthUrl = await wechat.oauthUrl(realUrl)
    //		return this.fail(403,'无权限',{oauthUrl})
    //	}
    //}

    // 加载or修改config的setup配置
    // const webconfig = await this.model('setup').getset()
    // think.config('setup', webconfig)
  }

  /**
   * 根据openid获得主键id；
   * @returns {Promise.<void>}
   */
  async getUserIdByOpenid(openid) {
    const user = await this.model('user').where({ open_id: openid }).find()
    return user.id
  }

  /**
   * 是否正确的openid
   * @param openid
   * @return {Promise.<boolean>}
   */
  async isRightOpenid(openid) {
    const user = await this.model('user').findByOpenId(openid)
    if (user && user.id) {
      return { state: true, user }
    } else {
      return { state: false }
    }
  }

  /**
   * 是否正确的id
   * @param openid
   * @return {Promise.<boolean>}
   */
  async isRightId(id) {
    const user = await this.model('user').findById(id)
    if (user && user.id) {
      return { state: true, user }
    } else {
      return { state: false }
    }
  }

  /**
   * 重写action的获取
   */
  getId() {
    let last = this.http.pathname.split('/').slice(-1)[0]
    if (last !== this.resource) {
      return last
    }
    return ''
  }

  /**
   * 重写请求方法
   */
  async baseRequest(methodName = 'GET') {
    this.id = this.id ? this.id : 'index'
    let action = this.id + (methodName.toUpperCase())
    if (!this[action] || !think.isFunction(this[action])) {
      return this.failByCode(90000)
    }
    try {
      let result = await this[action](this.get(), this.post())
      this.success(result)
    } catch (e) {
      if (think.isNumber(e)) {
        return this.failByCode(e)
      } else {
        return this.fail(10000, '未知错误：' + e.toString())
      }
    }
  }

  getAction() {
    return this.baseRequest('GET')
  }

  deleteAction() {
    return this.baseRequest('DELETE')
  }

  putAction() {
    return this.baseRequest('PUT')
  }

  postAction() {
    return this.baseRequest('POST')
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

    let AwardListProbability = []
    for (let i = 0, len = AwardList.length; i < len; i++) {
      AwardListProbability[i] = AwardList[i].probability
    }
    let AwardNum = this.getRandomAwardNum(AwardListProbability)
    return AwardList[AwardNum]

  }

  /**
   * 返回奖品序号
   * @param ProbabilityArr 奖品中奖概率的整数数组
   */
  getRandomAwardNum(ProbabilityArr) {
    let result
    let sumArr = ProbabilityArr.reduce((acc, val) => acc + val)
    for (let i = 0, len = ProbabilityArr.length; i < len; i++) {
      let randNum = this.getRandomIntInclusive(1, sumArr)
      if (randNum <= ProbabilityArr[i]) {
        result = i
        break
      } else {
        sumArr = sumArr - ProbabilityArr[i]
      }
    }
    return result
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
   *     生成一个code供兑奖比对
   */

  async randPrizeCode() {
    let haveUuid = true;
    let uuid;
    while (haveUuid) {
      uuid = this.generateUID(6);
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
   * 测试方法专用
   */
  async methodPOST({}, postData) {
    if (think.env !== 'development') {
      return { state: 'fail', msg: 'no_develop' }
    }
    const methodName = postData.methodName
    const params = postData.params
    if (this[methodName] && params) {
      return await this[methodName](...params)
    } else {
      return { state: 'fail', msg: 'method_error' }
    }
  }


  mockD(realData,mockData){
    if (think.env === 'development') {
      console.log('mockDDD')
      return mockData
    }
    return realData
  }
}
