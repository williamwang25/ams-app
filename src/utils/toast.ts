type ToastIcon = 'success' | 'error' | 'none'

function show(title: string, icon: ToastIcon = 'none') {
  uni.showToast({
    title,
    icon,
  })
}

export function useAppToast() {
  return {
    error: (title: string) => show(title, 'error'),
    show: (title: string) => show(title, 'none'),
    success: (title: string) => show(title, 'success'),
    warning: (title: string) => show(title, 'none'),
  }
}
