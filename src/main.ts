import { createSSRApp } from 'vue'
import App from './App.vue'
import { routeInterceptor } from './router/interceptor'
import { initCloud } from './utils/cloud'

import store from './store'
import '@/style/index.scss'
import 'virtual:uno.css'

export function createApp() {
  initCloud()
  const app = createSSRApp(App)
  app.use(store)
  app.use(routeInterceptor)

  return {
    app,
  }
}
