'use strict';
/**
 * model
 */
import Base from './relation.js';

export default class extends Base {

  init(...args) {
    super.init(...args);
  }

  async getSet(){
    let value = await think.cache("app", () => {
      return this.lists();
    }, {timeout: 365 * 24 * 3600});

    return value;
  }

  async lists (){
    try {
      let list = await this.where('1=1').select();
      let obj = {}
      list.forEach(v =>{
        obj[v.key]=v.value;
      })
      return obj;
    } catch (err) {
      return {};
    }

  }


}
