'use strict';

const jwt = require('jsonwebtoken');
export default class extends think.controller.rest {

    /**
     * some base method in here
     */

    __call() {
        let method = this.http.method.toLowerCase();
        //console.log(this.http.headers['access-control-request-method']) ;
        if (method === 'options') {
            this.setCorsHeader();
            this.end();
            return;
        }
        this.setCorsHeader();
        return super.__call();
    }

    setCorsHeader() {
        this.header('Access-Control-Allow-Origin', this.header('origin') || '*');
        this.header('Access-Control-Allow-Headers', 'x-requested-with,X-Token,Content-Type');
        this.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,DELETE");
        this.header('Access-Control-Allow-Credentials', 'true');
    }


    failByCode(code) {
        return super.fail(code, showErrooByCode(code), {})
    }


    /**
     * 获取用户信息
     */
    async userInfo() {
        let _debug = think.config('_DEBUG_')
        let debuguserid = 1
        if (_debug) {
            let user = await this.model('user').where({id: debuguserid}).find()
            return user
        }
        let USER_LOGIN_KEY = think.config('USER_LOGIN_KEY')
        let userid = await this.session(USER_LOGIN_KEY)
        if (think.isEmpty(userid)) {
            throw 30000
        }
        let user = await this.model('user').where({id: userid}).find()
        if (!user.id) {
            throw 30000
        }
        return user
    }

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
      const method = this.http.method.toLowerCase();
      if (method === 'options') {
        this.setCorsHeader();
        this.end();
        return;
      }
      // 验证token
      if (this.http.controller !== 'login' && method !== 'options') {
        this.setCorsHeader();
        const token = this.header('X-Token');
        try {
          jwt.verify(token, 'qwertyuiop');
          jwt.decode(token, { complete: true });
          //if(Math.floor(Date.now()/1000) - decoded.payload.iat <= 60){
          //    //续一个token
          //}
        } catch (err) {
          // err
          this.json({ code: 50000, message: '登录超时' })
          return this.end();
        }
      }


    }


    /**
     * 重写action的获取
     */
    getId() {
        let last = this.http.pathname.split('/').slice(-1)[0];
        if (last !== this.resource) {
            return last;
        }
        return '';
    }

    /**
     * 重写请求方法
     */
    async baseRequest(methodName = "GET") {
        this.setCorsHeader(); //设置跨域
        this.id = this.id ? this.id : 'index'
        let action = this.id + (methodName.toUpperCase())
        if (!this[action] || !think.isFunction(this[action])) {
            return this.failByCode(90000)
        }
        try {
            let result = await this[action](this.get(), this.post())
            //this.success(result)
            this.json(result)
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
   * 测试方法专用
   */
  async methodPOST ({}, postData) {
    if(think.env !== 'development'){
      return {state:'fail',msg:'no_develop'}
    }
    const methodName = postData.methodName
    const params = postData.params
    if (this[methodName] && params) {
      return await this[methodName](...params)
    } else {
      return {state: 'fail', msg: 'method_error'}
    }
  }

}
