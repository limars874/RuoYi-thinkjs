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
    return await think.cache("setup", () => {
      return this.lists();
    }, { timeout: 365 * 24 * 3600 });
  }

  async lists (){
    let list = await this.where('1=1').select();
    let obj = {}
    list.forEach(v =>{
      obj[v.key]=v.value;
    })
    return obj;
  }


}
