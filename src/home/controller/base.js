'use strict';


const SESSION_KEY = 'loginResult'

export default class extends think.controller.base {
  /**
   * some base method in here
   */

  fail(code) {
    return super.fail(code, error(code))
  }

  /*
    * 获取登陆用户信息
    */
  loginUser(userid) {
    return this.session(SESSION_KEY, userid)
  }

  /*
   * 当前登陆用户
   *
   */
  async currentUser() {
    let id = await this.session(SESSION_KEY)
    if (typeof(id) === 'object' || typeof(id) === 'undefined') {
      return
    }
    // id = id || 3
    try {
      let userInfo = await this.model('member').findByid(id)
      if (userInfo.id) {
        return userInfo
      }
    } catch (e) {
    }
  }


  * __before() {
    // let userInfo = yield this.currentUser()
    // this.userInfo = userInfo
    // this.assign({
    //   userInfo:userInfo
    // })
  }


//	/**
//	 * 校验是否需要授权
//	 * @return {[type]} [description]
//	 */
//	checkNeedOauth() {
//		 let controller  = this.http.controller
//	   let action  = this.http.action
//	   if(WHITE_LIST[controller]){
//	   		return WHITE_LIST[controller].indexOf(action)<0
//	   }
//	   return true
//	}
}
