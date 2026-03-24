import axios, { AxiosResponse, AxiosRequestConfig } from 'axios'
import { message } from 'antd'
// 创建 axios 实例
const service = axios.create({
  baseURL: '/',
  headers: {
    Accept: 'application/json',
    // 'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,
  withCredentials: true,
})

// request 拦截器
service.interceptors.request.use(
  config => {
    // 在发送请求之前做些什么
    // 例如：如果 token 存在，则让每个请求都携带 token,也可以封装一个getToken方法，如果token不纯在或者过期了，就登出
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    // 对请求错误做些什么，在这里可以对请求错误做统一处理
    // console.log("请求拦截器错误：" + error) //调试的时候可以用到
    return Promise.reject(error)
  }
)

const errorCode = {
  402: '账户余额不足，请充值后再试',
  422: '提示词有问题，请优化后再试',
  428: '基础会员只支持3个通道同时运行',
  429: '道路拥堵，正在增加通道，请稍后再试',
  500: '网络错误，请稍后再试',
}

const httpErrorCode = {
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '没有权限访问该资源',
  404: '接口不存在',
  405: '请求方法不允许',
  408: '请求超时，请稍后再试',
  409: '资源冲突，请稍后再试',
  413: '请求数据过大',
  422: '请求格式错误',
  429: '请求过于频繁，请稍后再试',
  500: '服务器内部错误',
  502: '网关错误，请稍后再试',
  503: '服务暂时不可用，请稍后再试',
  504: '网关超时，请稍后再试',
}

/**
 * 处理业务错误码
 * @param code - 错误码
 * @param res - 响应对象
 */
const handleBusinessError = (code: number, res: AxiosResponse) => {
  const errorMessage = errorCode[code as keyof typeof errorCode]
  if (!errorMessage) return

  const { msg } = res.data
  message.error(msg || errorMessage)

  // TODO: code 为 10 时执行退出登录
  // if (code === 10) logout()
}

/**
 * 处理 HTTP 错误
 * @param status - HTTP 状态码
 */
const handleHttpError = (status: number) => {
  const errorMessage = httpErrorCode[status as keyof typeof httpErrorCode]
  if (errorMessage) {
    message.error(errorMessage)
  }
}

// response 拦截器
service.interceptors.response.use(

  response => {
    if (response.data instanceof Blob) {
      return response.data
    }
    const { code } = response.data
    if (code === 0) {
      // 王豪
      return response.data.data
    }
    handleBusinessError(code, response)
    // 如果后端说code值为10（业务状态码），这里要退出登录,就是在这里处理一下
    return Promise.reject(response)
  },
  error => {
    const { status } = error
    handleHttpError(status)
    return Promise.reject(error)
  }
)

const request = async <T = any>(config: AxiosRequestConfig): Promise<T> => {
  return await service.request(config);
};

export default request
