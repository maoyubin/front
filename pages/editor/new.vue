<template>
    <div>
        <div class="write-btn">
            <el-button @click="submit" type="primary">提交</el-button>
        </div>

        <el-row>
            <el-col :span="12">
                <textarea ref="editor" class="md-editor" :value="content" @input="update"></textarea>
            </el-col>
            <el-col :span="12">
                <div class="markdown-body" v-html="compiledContent"></div>
            </el-col>
        </el-row>
    </div>
</template>

<script>
import marked from 'marked'
import hljs from 'highlight.js'
import javascript from 'highlight.js/lib/languages/javascript'
import 'highlight.js/styles/monokai-sublime.css'

export default {
    data(){
        return {
            content: `# 开课吧
* 上课
* 吃饭
\`\`\`javascript
        let a = 1
\`\`\`
            `
        }
    },
    mounted(){
        this.timer = null
        this.bindEvents()

        const renderer = new marked.Renderer()
        marked.setOptions({
            rendered: renderer,
            highlight(code){
                return hljs.highlightAuto(code).value
            }
        })
    },
    computed:{
        compiledContent(){
            return marked(this.content, {})
        }
    },
    methods:{
        update(e){
            clearTimeout(this.timer)
            this.timer = setTimeout(() => {
                this.content = e.target.value
            }, 350);
        },
        bindEvents(){

            window.addEventListener("paste", function(thePasteEvent){
                console.log(thePasteEvent.clipboardData)
                const files = thePasteEvent.clipboardData.files
            }, false);
            this.$refs.editor.addEventListener('drop', async e=>{
                
                const files = e.dataTransfer.files
                console.log(files)
                e.preventDefault()
            })
        },
        submit(){

        }
    }
}
</script>

<style lang="stylus">
.md-editor
    width 100%
    height 100vh
    outline: none
.write-btn
    position fixed
    z-index 100
    right 30px
    top 10px
</style>