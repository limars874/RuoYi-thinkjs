/**
 * token管理器
 */
'use strict';
export default class extends think.service.base {
	
  init(...args){
  	think.debugLog('TokenService init....')
    super.init(...args);
  }
   
  /**
   * 生成token
   */  
  async create(timeout) {
  	let token = think.uuid(32) + Date.now() + (Math.floor(Math.random()*999+1000))
  	await think.cache(token,{a:1})
  	think.debugLog('缓存了token：'+token)
	return token   	 
  }
  
  /**
   * 校验tokens
   */
  async validate(token) {
  	let result = await think.cache(token)
  	if(think.isEmpty(result)){
  		return false 
  	}
  	return true 
  }
  
  /**
   * 使token失效
   */
  async invalidate(token) {
  	await think.cache(token,undefined)
  }
  
  /**
   * 设置token值
   */
  async set(token,key,value){
  	let values  = await think.cache(token) 
  	if(think.isEmpty(values)){
  		return false 
  	}
  	values[key] = value 
  	await think.cache(token,values)
  	return true
  }
  
  /**
   * 得到token的值
   * key存在则得到对应的数据，否则就全部数据
   */
  async get(token,key){
  	let values  = await think.cache(token) 
  	think.debugLog('getotken:')
  	console.log(values)
  	if(think.isEmpty(values)){
  		return 
  	}
  	if(think.isEmpty(key)){
  		return values 
  	}
  	await think.cache(token,values) 
  	return values[key]
  }
   
  /**
   * 移除值
   */
  async remove(token,key){
  	let values  = await think.cache(token) 
  	delete values[key]
  }
  
}