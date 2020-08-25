<template>
    <div>
        <h1>用户中心</h1>

        <div ref='drag' id="drag">
            <input type="file" name="file" @change="handleFileChnage">
        </div>

        <div>
            <el-progress :stroke-width='20' :text-inside='true' :percentage="uploadProgress" ></el-progress>
        </div>
        <div>
            <el-button @click="uploadFile">upLoad</el-button>
        </div>

        <div>
            <p>CAL Hash progress</p>
            <el-progress :stroke-width='20' :text-inside='true'  :percentage="hashProgress" ></el-progress>
        </div>

    
        <div>
            <div class="cube-container" :style="{width:cubeWidth + 'px'}">
                <div class="cube" v-for="chunk in chunks" :key="chunk.name">
                    <div
                        :class="{
                            'uploading': chunk.progress>0&&chunk.progress<100,
                            'success': chunk.progress==100,
                            'error': chunk.progress < 0
                        }"
                        :style="{height:chunk.progress+'%'}"
                    ></div>
                    <i class="el-icon-loading" style="color:#f56c6c" v-if="chunk.progress<100 && chunk.progress >0"></i>
                </div>
                    
            </div>
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
.cube-container
    margin-left 100px
    .cube
        width 14px
        height 14px
        line-height 12px
        border 1px black solid 
        background #eee
        float left
        >.success
            background green
        >.uploading
            background blue
        >.error
            background red
    
</style>

<script>
import { resolve } from 'url'
import sparkMD5 from 'spark-md5'
//&:hover
//        border-color red
const CHUNK_SIZE = 1* 1024 * 1024
export default {
    mounted(){
        const ret = this.$http.get('/user/info')

        this.bindEvents()
    },
    data(){
        return {
            file: null,
            //uploadProgress: 0,
            hashProgress: 0,
            chunks:[],
            fileHash:''
        }
    },
    computed:{
        cubeWidth(){
            return Math.ceil(Math.sqrt(this.chunks.length))*16
        },
        uploadProgress(){
            if(!this.file || this.chunks.length==0){
                return 0
            }
            const loaded = this.chunks.map(item=> {
                    //console.log('item.chunk.size',item.chunk.size)
                 //console.log('item.progress',item.progress)
                return item.chunk.size*item.progress
            })
            .reduce((acc, cur) => acc+cur, 0)
            console.log('loaded',loaded)

            return parseInt(((loaded*100)/this.file.size).toFixed(2))
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
                    this.hashProgress = Number(progress.toFixed(2))
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
                            this.hashProgress = Number(
                                ((100*count)/chunks.length).toFixed(2)
                                )
                        }else{
                            this.hashProgress = 100
                            resolve(spark.end())
                        }
                    }
                    window.requestIdleCallback(workLoop)
                }
                window.requestIdleCallback(workLoop)
            }) 

        },

        async calculateHashSample(){
            return new Promise(resolve=>{
                const spark = new sparkMD5.ArrayBuffer()
                const reader = new FileReader()
                const file = this.file
                const size = file.size
                const offset = 2*1024*1024

                //first 2m chunck and the last chunck
                //in the midlle and the front mille  and end get 2byte

                let chunks = [file.slice(0,offset)]

                let cur = offset
                while(cur<size){
                    if(cur+offset>=size){
                        chunks.push(file.slice(cur, cur+offset))
                    }else{
                        const mid = cur + offset/2

                        const end = cur + offset
                        chunks.push(file.slice(cur, cur+2))

                        chunks.push(file.slice(mid, mid+2))

                        chunks.push(file.slice(end-2, end))
                    }
                    cur +=offset
                }

                reader.readAsArrayBuffer(new Blob(chunks))
                reader.onload= e=>{
                    spark.append(e.target.result)
                    this.hashProgress = 100
                    resolve(spark.end())
                }

            })

        },
        async uploadFile(){
            // if(! await this.isImage(this.file)){
            //     alert('this is not deired image')
            //     return
            // }
            this.hashProgress= 0 

            const chunks = this.createFileChunk(this.file)
            //const hash1 = await this.calculateHashWorker()
            //const hash2 = await this.calculateHashIdle()
            const hash= await this.calculateHashSample()
            //console.log('file hash1 :',hash1)
            //console.log('file hash2 :',hash2)
            //console.log('file hash3 :',hash)
            
            this.fileHash = hash
            this.chunks = chunks.map((chunk, index) =>{
                const name = hash +'-' + index
                return {
                    hash,
                    name,
                    index,
                    chunk:chunk.file,
                    progress:0
                }
            })

            await this.uploadChunks()

            /** 
            const form = new FormData()
            form.append('name','file')
            form.append('file',this.file)

            const ret = await this.$http.post('/uploadfile', form, {
                onUploadProgress:progress=>{
                    this.uploadProgress = Number(((progress.loaded/progress.total)*100).toFixed(2))
                }
            })
            console.log(ret)*/
        },
        async uploadChunks(){

            const requests = this.chunks.map((chunk, index)=>{
                //convert the promise
                const form = new FormData()
                form.append('chunk',chunk.chunk)
                form.append('hash',chunk.hash)
                form.append('name',chunk.name)
                return form
            }).map((form, index)=>
                this.$http.post('/uploadfile', form ,{
                    onUploadProgress: progress=>{
                        this.chunks[index].progress = Number(((progress.loaded/progress.total)*100).toFixed(2))
                    }
                })
            )
            //todo并发量的控制
            await Promise.all(requests)

            await this.mergeRequest()
        },
        async mergeRequest(){
            this.$http.post('/mergefile',{
                ext:this.file.name.split('.').pop(),
                size:CHUNK_SIZE,
                hash: this.fileHash
            })
        },
        handleFileChnage(e){
            const [file] = e.target.files
            if(!file) return 

            this.file = file
        }
    }
}
</script>