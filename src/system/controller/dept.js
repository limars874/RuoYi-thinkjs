'use strict';
import Base from './baseRest.js';
import camelcaseKeys from 'camelcase-keys'
import resEnum from "../../home/config/resEnum"


export default class extends Base {


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

    this.res({   })
  }

  /**
   * 根据id获取信息
   * @returns {Promise<void>}
   */
  async restGET({}, {}) {

    this.res()
  }


  /**
   * 添加
   * @param deptIds
   * @param menuIds
   * @param remark
   * @param roleKey
   * @param roleName
   * @param roleSort
   * @param status
   * @returns {Promise<void>}
   */
  async indexPOST({}, { deptIds, menuIds, remark, roleKey, roleName, roleSort, status }) {


    this.res()
  }


  async indexPUT({}, { deptIds, menuIds, remark, roleKey, roleName, roleSort, status, dataScope, roleId }) {

    this.res()
  }

  /**
   * 根据role id 返回menu和被选中的menu_id集合
   * @returns {Promise<void>}
   */
  async roleDeptTreeselectGET() {
    if (!this.id || !parseInt(this.id)) {
      throw this.errorText().paramError
    }
    const deptData = await this.model('sys_dept').where({del_flag :0}).order('parent_id, order_num').select();
    const sql = `select d.dept_id, d.parent_id from sys_dept d left join sys_role_dept rd on d.dept_id = rd.dept_id 
      where rd.role_id = ${this.id} and d.dept_id not in (select d.parent_id from sys_dept d inner join sys_role_dept rd on
       d.dept_id = rd.dept_id and rd.role_id = ${this.id}) order by d.parent_id, d.order_num`
    const res = await this.model('sys_dept').query(sql)
    const checkedKeys = res.map(i => {
      return i.dept_id
    })
    console.log(deptData)
    const depts = this.arr_to_tree(deptData, 0)
    this.res({ checkedKeys, depts })

  }

  arr_to_tree(data, parent_id) {
    let result = [], temp;
    let length = data.length;
    for (let i = 0; i < length; i++) {
      if (data[i].parent_id === parent_id) {
        const element = { id: data[i].dept_id, label: data[i].dept_name }
        result.push(element);
        temp = this.arr_to_tree(data, data[i].dept_id);
        if (temp.length > 0) {
          element.children = temp;
          element.chnum = element.children.length;
        }
      }
    }
    return result;
  };


  /**
   * 检测role
   * @param roleId
   * @returns {Promise<{role_id}|*>}
   */
  async checkRole(roleId) {
    const role = await this.model('sys_role').where({ role_id: roleId }).find();
    if (role.role_id) {
      return role
    } else {
      throw resEnum.paramError
    }
  }

  /**
   * 检测角色名称重复
   * @param roleName
   * @returns {Promise<void>}
   */
  async checkRoleNameUnique(roleName) {
    if (!roleName) {
      throw '角色名称或未填写'
    }
    const role = await this.model('sys_role').where({ role_name: roleName }).find();
    if (role.role_id) {
      throw '角色名称已存在，不能添加该角色'
    }
  }

  /**
   * 检测角色权限字符重复
   * @param roleKey
   * @returns {Promise<void>}
   */
  async checkRoleKeyUnique(roleKey) {
    if (!roleKey) {
      throw '权限字符或未填写'
    }
    const role = await this.model('sys_role').where({ role_key: roleKey }).find();
    if (role.role_id) {
      throw '角色权限字符已存在，不能添加该角色'
    }
  }


}
