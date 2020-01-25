/**
 * 短信工具
 */
'use strict';
export default class extends think.service.base {
	
  init(...args){
  	think.debugLog('SMSService init....')
    super.init(...args);
  }
  
  /**
   * @return code
   */
  async send(mobile){
  	
  }
  
  /**
   * 校验正确
   */
  async valida(mobile,code){
  	
  }
  
  
}