'use strict'
/**
 * model
 */
import Base from './relation.js'

export default class extends Base {

  init(...args) {
    super.init(...args)
  }

  /**
   * 验证帐号密码
   * @param email
   * @param password
   * @returns {boolean}
   */
  async isAdmin(email, password) {
    const isAdmin = await this.where({ account: email, password, status: 1 }).find()
    return isAdmin
  }

  /**
   * 带分页的adminlist请求
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

  /**
   * 添加admin user表和role表的值
   * @param add
   * @returns {Promise.<{}>}
   */
  async addNewAdmin(val) {
    const { name, account, password, status, type } = val
    const addId = await this.add({ name, account, password, status, type })
    return addId
  }

  /**
   *  更新admin user和role表的值
   * @param val {update,key},key为user id
   * @returns {Promise.<{}>}
   */
  async updateAdmin(val) {
    const { update, key } = val
    const updateUserData = {
      name: update.name,
      account: update.account,
      password: update.password,
      email: update.password,
      status: update.status,
      type: update.type
    }
    const updateUser = await this.where({ id: key }).update(updateUserData)
    if (updateUser) {
      return true
    } else {
      return false
    }
  }

  /**
   * 删除管理员信息与关联信息
   * @param id
   * @returns {Promise.<{}>}
   */
  async deleteAdmin(id) {
    const deleteUser = await this.where({ id }).delete()
    if (deleteUser) {
      return true
    } else {
      return false
    }
  }

}
