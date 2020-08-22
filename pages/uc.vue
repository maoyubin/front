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
//&:hover
//        border-color red
export default {
    mounted(){
        const ret = this.$http.get('/user/info')

        this.bindEvents()
    },
    data(){
        return {
            file: null,
            uploadProgress: 0
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
        async uploadFile(){
            // if(! await this.isImage(this.file)){
            //     alert('this is not deired image')
            //     return
            // }


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