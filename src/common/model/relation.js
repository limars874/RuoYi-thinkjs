'use strict';
/**
 * model
 */

import Base from './base.js';
//import Moment from 'moment';

export default class extends think.model.relation {


  /**
   * 根据id找数据
   * @param  {[type]} id [description]
   * @return {Promise} 返回数据
   */
  async findById(id) {
    let r = await this.where({ id }).find()
    if (!r.id) {
      return
    }
    return r
  }


  async update(data) {
    data.modify_date = think.datetime()
    return super.update(data)
//		let id = await  super.update(data)
//		return  super.where({id}).find()
  }

  async updateNoDate(data) {
    return super.update(data)
  }

  async inc(field, step = 1) {
    let data = {
      [field]: ['exp', `\`${field}\`+${step}`]
    };
    return super.update(data);
  }

  async dec(field, step = 1) {
    let data = {
      [field]: ['exp', `\`${field}\`-${step}`]
    };
    return super.update(data);
  }


  add(data) {
    data.create_date = think.datetime()
    return super.add(data)
  }

  /**
   * 创建数据
   */
  create(data) {
    data.create_date = think.datetime()
    let id = super.add(data)
    data.id = id
    return data
  }

  /*
   * page  第几页
   * size  每页长度
   *
   */
  async pageable(page = 0, size = 10, where = {}, sort) {
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
    let r = await super.page([parseInt(page) + 1, size]).where(where).order(order).countSelect()
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
