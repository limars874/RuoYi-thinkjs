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

  /**
   * 根据openid找数据
   * @param  {[type]} open_id [description]
   * @return {Promise} 返回数据
   */
  async findByOpenId(open_id) {
    let r = await this.where({ open_id }).find()
    if (!r.id) {
      return
    }
    return r
  }

  async regist({ openid, nickname, sex, head_img, province, city }) {
    let result = await this.where({ open_id: openid }).find()
    if (!result.id) {
      result = { open_id: openid, nickname, head_img, sex, province, city }
      result.id = await this.add(result)
    }
    return result
  }


  async selectUserByUserName(userName) {
    const sql = `select u.user_id, u.dept_id, u.user_name, u.nick_name, u.email, u.avatar, u.phonenumber, u.password,
              u.sex, u.status, u.del_flag, u.login_ip, u.login_date, u.create_by, u.create_time, u.remark, d.dept_id,
              d.parent_id, d.dept_name, d.order_num, d.leader, d.status as dept_status, r.role_id, r.role_name, r.role_key, 
              r.role_sort, r.data_scope, r.status as role_status from sys_user u left join sys_dept d on u.dept_id = d.dept_id
               left join sys_user_role ur on u.user_id = ur.user_id left join sys_role r on r.role_id = ur.role_id where
                u.user_name = '${userName}'`
    let res = await this.query(sql);
    res = res[0] ? res[0] : {}
    const dept = _.pick(res, ['dept_id', 'parent_id', 'dept_name', 'order_num', 'leader', 'dept_status'])
    const roles = _.pick(res, ['role_id', 'role_name', 'role_key', 'role_sort', 'data_scope', 'role_status'])
    const user = _.pick(res, ['user_id', 'dept_id', 'user_name', 'nick_name', 'email', 'avatar', 'phonenumber',
      'password', 'sex', 'status', 'del_flag', 'login_ip', 'login_date', 'create_by', 'create_time', 'remark'])
    user.dept = dept
    user.roles = roles
    return user

  }

}
