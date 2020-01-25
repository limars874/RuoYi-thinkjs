'use strict'

export default class extends think.controller.rest {

  /**
   * some base method in here
   */

  __call() {
    let method = this.http.method.toLowerCase()
    if (method === 'options') {
      this.end()
      return
    }
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


  async __before() {
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

  res(data) {
    this.json(Object.assign({
      code: 200,
      msg: '操作成功'
    }, data))
  }
}
