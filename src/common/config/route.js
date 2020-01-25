export default {
  admin: {//系统后台
    reg: /^admin/
  },
  api: {//api
    reg: /^api/
  },
  // 默认走home
  home: {
    reg: /^(login|getInfo|getRouters|captchaImage)/
  }
}
