'use strict';
/**
 * model
 */
import Base from './relation.js';
import Redis from 'ioredis'

export default class extends Base {


  init(...args) {
    super.init(...args);
    this.relation = {
      user: {
        type: think.model.HAS_ONE,
        key: 'user_id',
        fKey: 'id',
        field: 'id,open_id,nickname,tel,name,department,job_number'
      }
    };
  }


  /**
   * 从openid获取id
   * @param openid
   * @returns {*}
   */
  async get_id_by_openid(openid) {
    const user = await this.where({ open_id: openid }).find();
    if (user) {
      return user.id;
    } else {
      return false;
    }
  }

  /**
   * 后台管理-分页请求
   * @param page
   * @param size
   * @param where
   * @param sort
   * @returns {}
   */
  async adminpage(page = 0, size = 10, where = {}, sort) {
    page = parseInt(page)
    size = parseInt(size)
    const order = {} // { name: desc }
    if (sort) {
      if (!think.isArray(sort)) {
        sort = [sort]
      }
      for (const item of sort) {
        const s = item.split(',')
        //  ['name','desc']
        order[s[0]] = s[1]
      }
    }
    const r = await super.page([parseInt(page), size]).where(where).order(order).countSelect()
    const last = page === r.totalPages - 1
    return {
      content: r.data,
      totalPages: r.totalPages,
      totalElements: r.count,
      number: page,
      size,
      last,
      first: page === 0,
      numberOfElements: last ? r.count - size * page : size
    }
  }



  //企业付款
  async PayToWx(memberId, amount) {
    let WechatService = think.service('wechat')
    let wxService = new WechatService()
    let user = await this.where({ id: memberId }).find()

    if (!user || !user.open_id) {
      return null
    }
    let orderId = 'prizeAmount' + wxService.randomKey()
    let openid = user.open_id
    let wishing = think.config('wishing')
    return wxService.PayToWx(orderId, openid, amount, wishing)
  }



}
