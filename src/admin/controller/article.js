'use strict';
import Base from './baseRest.js';
import fs from 'fs';
import Promise from 'bluebird'
import path from 'path';



export default class extends Base {

  /**
   * 处理编辑器上传图片，返回图片url
   * @param getdata
   * @param postdata
   * @returns {{msg: string}}
   */
  async upload_imgPOST(getdata, postdata) {
    const uploadImg = this.file();
    let prefixName = '';
    if (postdata.postToken) {
      prefixName = postdata.postToken;
    }
    const imgurl = await this.saveImageFile(uploadImg, prefixName)
    return { url: imgurl };
  }

  /**
   * 保存文件格式图片，返回url
   * @param file
   * @param prefixName
   * @returns {string}
   */
  async saveImageFile(file, prefixName) {
    let dir = think.config('uploadFileDIR');
    let randomName = Date.now() + Math.floor(Math.random() * 1000 + 1000);
    if (prefixName) {
      randomName = prefixName + '_' + randomName
    }
    const fileName = file.file.originalFilename;
    const fileExt = this.GetFileExt(fileName);
    let saveDir = path.join(dir, "upload", randomName, fileExt)
    await this.streamWriteToFile(file.file.path, saveDir)
    return think.config('preUploadDIR') + '/upload/' + randomName + "." + fileExt
  }

  /**
   *
   * @param path
   * @param saveDir
   */
  streamWriteToFile(path, saveDir) {
    return new Promise((resolve, reject) => {
      let file = fs.createReadStream(path);
      let write = fs.createWriteStream(saveDir)
      file.pipe(write);
      write.on('finish', () => {
        resolve();
      });
    })
  }


  /**
   * 保存64格式的图片，返回url
   * @param img
   * @returns {string}
   */
  saveBase64Image(img, prefixName) {
    const reg = /^data:image\/(\w+);base64,/;
    const regExec = reg.exec(img);
    let extName = regExec[1];
    if (extName == 'jpeg') {
      extName = 'jpg'
    }
    let base64Data = img.replace(/^data:image\/\w+;base64,/, "");
    let dir = think.config('uploadFileDIR');
    let randomName = Date.now() + Math.floor(Math.random() * 1000 + 1000)
    if (prefixName) {
      randomName = prefixName + '_' + randomName
    }
    let saveDir = path.join(dir, "upload", randomName + "." + extName)
    let dataBuffer = new Buffer(base64Data, 'base64');
    fs.writeFileSync(saveDir, dataBuffer);
    return think.config('preUploadDIR') + '/upload/' + randomName + "." + extName
  }

  //取文件后缀名
  GetFileExt(filepath) {
    if (filepath != "") {
      return "." + filepath.replace(/.+\./, "");
    }
    return ''
  }

  /**
   * 取正则括号捕获的内容1，返回数组
   * @param str
   * @param regx
   * @constructor
   */
  GetRegex(str, regx) {
    let i = 0;
    let result = [];
    let ele;
    while ((ele = regx.exec(str)) != null) {
      result[i] = ele[1];
      i++;
    }
    return result;
  }

}
