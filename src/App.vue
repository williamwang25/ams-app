<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { navigateToInterceptor } from '@/router/interceptor'
import { useUserStore } from '@/store'
import { getErrorMessage, initCloud } from '@/utils/cloud'

const LOGIN_PAGE = '/pages/login/index'
const HOME_PAGE = '/pages/index/index'

function normalizePath(path?: string) {
  if (!path) return HOME_PAGE
  return path.startsWith('/') ? path : `/${path}`
}

onLaunch((options) => {
  console.log('App.vue onLaunch', options)
  initCloud()
  const userStore = useUserStore()
  void userStore.bootstrapAuth()
    .then((profile) => {
      const currentPath = normalizePath(options?.path)
      if (!profile && currentPath !== LOGIN_PAGE) {
        uni.reLaunch({ url: LOGIN_PAGE })
      }
      if (profile && currentPath === LOGIN_PAGE) {
        uni.reLaunch({ url: HOME_PAGE })
      }
    })
    .catch((error: unknown) => {
      console.warn('教师免密登录失败', getErrorMessage(error))
    })
})
onShow((options) => {
  console.log('App.vue onShow', options)
  // 处理直接进入页面路由的情况：如h5直接输入路由、微信小程序分享后进入等
  // https://github.com/unibest-tech/unibest/issues/192
  if (options?.path) {
    navigateToInterceptor.invoke({ url: `/${options.path}`, query: options.query })
  }
  else {
    navigateToInterceptor.invoke({ url: '/' })
  }
})
onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">

</style>
