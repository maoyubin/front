<template>
    <div>
        <h1>用户中心</h1>

        <div ref='drag' id="drag">
            <input type="file" name="file" @change="handleFileChnage">
        </div>

        <div>
            <el-progress :stroke-width='20' :text-inside='true'  :percentage="uploadProgress" ></el-progress>
        </div>
        <div>
            <el-button @click="uploadFile">upLoad</el-button>
        </div>

        <div>
            <p>CAL Hash progress1</p>
            <el-progress :stroke-width='20' :text-inside='true'  :percentage="hashProgress1" ></el-progress>
            <p>CAL Hash progress2</p>
            <el-progress :stroke-width='20' :text-inside='true'  :percentage="hashProgress2" ></el-progress>
        </div>

    </div>
</template>

<style lang="stylus">
#drag
    height 100px
    line-height 100px
    border 2px dashed #eee
    text-align center
    vertical-align middle
    
</style>

<script>
import { resolve } from 'url'
import sparkMD5 from 'spark-md5'
//&:hover
//        border-color red
const CHUNK_SIZE = 0.5* 1024 * 1024
export default {
    mounted(){
        const ret = this.$http.get('/user/info')

        this.bindEvents()
    },
    data(){
        return {
            file: null,
            uploadProgress: 0,
            hashProgress1: 0 ,
            hashProgress2: 0 
        }
    },
    methods:{
        bindEvents(){
            const drag = this.$refs.drag
            drag.addEventListener('dragover', e=>{
                drag.style.borderColor = 'red'
                e.preventDefault()
            })

            drag.addEventListener('dragleave', e=>{
                drag.style.borderColor = '#eee'
                e.preventDefault()
            })

            drag.addEventListener('drop', e=>{
                e.preventDefault()
                const fileList = e.dataTransfer.files
                drag.style.borderColor = '#eee'
                this.file = fileList[0]
            })
        },
        async blobToString(file){
            return new Promise(resolve => {
                const reader = new FileReader()
                reader.onload = function(){
                    const ret = reader.result.split('')
                                    .map(v=>v.charCodeAt())
                                    .map(v=>v.toString(16).toUpperCase())
                                    .join(' ')
                    resolve(ret)
                }
                reader.readAsBinaryString(file)
            })
        },
        async isGif(file){
            //前面16进制 '47 49 46 38 39 61'  '47 49 46 38 37 61'
            const ret = await this.blobToString(file.slice(0, 6))
            
            const isGif = (ret =='47 49 46 38 39 61') || (ret == '47 49 46 38 37 61')
            return isGif
        },
        async isImage(file){
            //通过文件流判断
            return await this.isGif(file)
        },
        createFileChunk(file, size=CHUNK_SIZE){
            const chunks = []
            let cur = 0
            while(cur < this.file.size){
                chunks.push({index:cur, file:this.file.slice(cur, cur + size)})
                cur +=size
            }
            return chunks
        },

        async calculateHashWorker(){
            return new Promise(resolve=>{
                this.worker = new Worker('/hash.js')
                this.worker.postMessage({chunks:this.chunks})
                this.worker.onmessage= e=>{
                    const {progress, hash} = e.data
                    this.hashProgress1 = Number(progress.toFixed(2))
                    if(hash){
                        resolve(hash)
                    }
                }
            })
        },

        async calculateHashIdle(){
            return new Promise(resolve=>{
                const chunks = this.chunks
                const spark = new sparkMD5.ArrayBuffer()
                let count = 0
                const appendToSpark = async file =>{
                    return new Promise(resolve=>{
                        const reader = new FileReader()
                        reader.readAsArrayBuffer(file)
                        reader.onload = e => {
                            spark.append(e.target.result)
                            resolve()
                        }
                    })
                }
                const workLoop = async deadline => {
                    while(count < chunks.length && deadline.timeRemaining()>1){
                        //空闲时间，且有任务
                        await appendToSpark(chunks[count].file)
                        count++
                        if(count<chunks.length){
                            this.hashProgress2 = Number(
                                ((100*count)/chunks.length).toFixed(2)
                                )
                        }else{
                            this.hashProgress2 = 100
                            resolve(spark.end())
                        }
                    }
                    window.requestIdleCallback(workLoop)
                }
                window.requestIdleCallback(workLoop)
            }) 

        },
        async uploadFile(){
            // if(! await this.isImage(this.file)){
            //     alert('this is not deired image')
            //     return
            // }
            this.hashProgress1= 0 
             this.hashProgress2= 0 

            this.chunks = this.createFileChunk(this.file)
            const hash1 = await this.calculateHashWorker()

            const hash2 = await this.calculateHashIdle()
            console.log('file hash1 :',hash1)
            console.log('file hash1 :',hash2)

            return
            const form = new FormData()
            form.append('name','file')
            form.append('file',this.file)

            const ret = await this.$http.post('/uploadfile', form, {
                onUploadProgress:progress=>{
                    this.uploadProgress = Number(((progress.loaded/progress.total)*100).toFixed(2))
                }
            })
            console.log(ret)
        },

        handleFileChnage(e){
            const [file] = e.target.files
            if(!file) return 

            this.file = file
        }
    }
}
</script>