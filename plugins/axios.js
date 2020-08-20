import Vue from 'vue'
import axios from 'axios'
import {MessageBox} from 'element-ui'
const service = axios.create({
    baseURL:'/api'
})

Vue.prototype.$http = service


export default ({store, redirect}) =>{
    //请求拦截
//主要做token
service.interceptors.request.use(
    async config=>{
        const token = localStorage.getItem('token')
        if(token){
            config.headers.common['Authorization'] = 'Bearer '+token
        }
        return config
    }
)

//响应拦截
service.interceptors.response.use(
    async response=>{
        let {data} = response

        if(data.code === -666){
            MessageBox.confirm('登录也过期','过期',{
                confirmButtonText:'登录',
                showCancelButton:false
            }).then(()=>{
                localStorage.removeItem('token')
                redirect({path:'login'})
            })
        }

        return data
    }
)


}



export const http = service