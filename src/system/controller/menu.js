'use strict';
import Base from './baseRest.js';
import camelcaseKeys from 'camelcase-keys'


export default class extends Base {

  // async getAction() {
  //   if (this.http.pathname.indexOf('roleMenuTreeselect') !== -1) {
  //     return await this.roleMenuTreeSelect(this.get(), this.post())
  //   }
  //   if (this.id === 'list') {
  //     return await this.list(this.get(), this.post())
  //   }
  //   return await this.restGet(this.get(), this.post())
  //
  // }


  /**
   * list 列表
   * @param pageNum
   * @param pageSize
   * @param roleName
   * @param roleKey
   * @param endTime
   * @param beginTime
   * @param status
   * @returns {Promise<void>}
   */
  async listGET({ pageNum, pageSize, roleName, roleKey, endTime, beginTime, status }, {}) {
    pageNum = parseInt(pageNum) ? parseInt(pageNum) : 1
    pageSize = parseInt(pageSize) ? parseInt(pageSize) : 10
    const where = _.omitBy({
      del_flag: 0,
      role_name: roleName,
      role_key: roleKey,
      status
    }, i => _.isUndefined(i) || i === '')

    if (beginTime && endTime) {
      beginTime = beginTime + ' 00:00:00'
      endTime = endTime + ' 23:59:59'
      where.create_time = { '>=': beginTime, '<=': endTime }
    }
    const sort = ['role_sort,asc']
    const data = await this.model('sys_role').list(pageNum, pageSize, where, sort)

    const total = data.totalElements
    const rows = data.content.map(i => {
      i.create_time = think.datetime(i.create_time, 'YYYY-MM-DD HH:mm:ss')
      return camelcaseKeys(i)
    })
    this.res({ total, rows })
  }


  async roleMenuTreeselectGET() {
    if (!this.id || !parseInt(this.id)) {
      throw this.errorText().paramError
    }
    const menuData = await this.model('sys_menu').where('1=1').order('parent_id, order_num').select();
    const sql = `select m.menu_id, m.parent_id from sys_menu m  
    left join sys_role_menu rm on m.menu_id = rm.menu_id where rm.role_id = ${this.id} and m.menu_id not in 
     (select m.parent_id from sys_menu m inner join sys_role_menu rm on m.menu_id = rm.menu_id and 
      rm.role_id = ${this.id}) order by m.parent_id, m.order_num`
    const res = await this.model('sys_menu').query(sql)
    const checkedKeys = res.map(i => {
      return i.menu_id
    })
    const menus = this.arr_to_tree(menuData, 0)
    this.res({ checkedKeys, menus })

  }


  async restGET({}, {}) {
    const where = { role_id: this.id }
    const data = await this.model('sys_role').where(where).find();
    let res
    if (data.role_id) {
      data.create_time = think.datetime(data.create_time)
      data.update_time = think.datetime(data.update_time)
      res = camelcaseKeys(data)
    }
    this.res({ data: res })
  }




  arr_to_tree(data, parent_id) {
    let result = [], temp;
    let length = data.length;
    for (let i = 0; i < length; i++) {
      if (data[i].parent_id === parent_id) {
        const element = { id: data[i].menu_id, label: data[i].menu_name }
        result.push(element);
        temp = this.arr_to_tree(data, data[i].menu_id);
        if (temp.length > 0) {
          element.children = temp;
          element.chnum = element.children.length;
        }
      }
    }
    return result;
  };

}
