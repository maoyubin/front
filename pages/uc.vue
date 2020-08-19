<template>
    <div>
        <h1>用户中心</h1>
    </div>
</template>

<script>
export default {
    mounted(){
        const ret = this.$http.get('/user/info')

        console.log('11111111',ret)
    }
}
</script>