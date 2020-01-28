'use strict'
/**
 * model
 */
import Base from './relation.js'

const request = require('superagent')

export default class extends Base {

  init(...args) {
    super.init(...args)
  }


  /*
   * admin后台用户列表请求
   * page
   * size  每页长度
   *
   */
  async adminpage(page = 0, size = 10, where = {}, sort) {
    page = parseInt(page)
    size = parseInt(size)
    let order = {}		//{name:desc}
//		sort  [] "name,desc"
    if (sort) {
      if (!think.isArray(sort)) {
        sort = [sort]
      }
      for (let item of sort) {
        let s = item.split(",")
        //  ['name','desc']
        order[s[0]] = s[1]
      }
    }

    let r = await super.page([parseInt(page), size]).where(where).order(order).countSelect();
    let last = page === r.totalPages - 1
    return {
      content: r.data,
      totalPages: r.totalPages,
      totalElements: r.count,
      number: page,
      size: size,
      last: last,
      first: page == 0,
      numberOfElements: last ? (r.count - size * page) : size
    }
  }




}
