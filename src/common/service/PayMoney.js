/**
 * 短信工具
 */
'use strict';
export default class extends think.service.base {


  async init( totalMoney, minMoney, maxMoney ,size ){
  	think.debugLog('PayMoney init....')
    // super.init(...args);
    this.totalMoney = totalMoney || 100
    this.minMoney = minMoney || 1
    this.maxMoney = maxMoney || this.totalMoney
    this.size = size || 50
    this.remainMoney = this.totalMoney
    this.instance = null;
  }

  static getInstance(totalMoney, minMoney, maxMoney ,size, is_new_instance){
    if(is_new_instance){
      this.instance = new this(totalMoney, minMoney, maxMoney ,size);
      return this.instance
    }
    if(!this.instance) {
      this.instance = new this(totalMoney, minMoney, maxMoney ,size)
    }
    return this.instance;
  }

  getRandomMoney() {
    console.log('size',this.size)
    if( this.size === 1) {
      this.size -= 1;
      if(this.remainMoney < this.minMoney){
        return this.minMoney;
      } else if( this.remainMoney >= this.maxMoney){
        return this.maxMoney;
      } else {
        return Math.round(this.remainMoney*100)/100;
      }
    }
    if( this.size < 1) {
      return this.minMoney;
    }
    const r = Math.random();
    const max = this.remainMoney / this.size * 4;
    let money = r * max;
    if(money < this.minMoney){
      money = this.minMoney
    } else if(money >= this.maxMoney){
      money = this.maxMoney
    }
    money = Math.floor(money*100)/100;
    this.size -= 1;
    this.remainMoney -= money;
    console.log(money, this.remainMoney)
    return money
  }

  static reset(){
    this.instance = null;
  }
  
}
