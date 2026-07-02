import type { TeacherProfile, TeacherProfileUpdateInput } from '@/types/auth'
import type { UserInfo } from '@/types/user'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  teacherLoginByOpenid as requestTeacherLoginByOpenid,
  teacherLoginByPassword as requestTeacherLoginByPassword,
  teacherUpdateProfile as requestTeacherUpdateProfile,
} from '@/api/auth'
import { CloudFunctionError } from '@/utils/cloud'

const emptyUserInfo: UserInfo = {
  userId: -1,
  username: '',
  nickname: '',
  avatar: '/static/images/default-avatar.png',
  role: '',
  roles: [],
}

function toUserInfo(profile: TeacherProfile): UserInfo {
  return {
    userId: 0,
    username: profile.username,
    nickname: profile.name,
    avatar: '/static/images/default-avatar.png',
    role: 'teacher',
    roles: ['teacher'],
    teacherId: profile._id,
    department: profile.department,
    phone: profile.phone,
  }
}

export const useUserStore = defineStore(
  'user',
  () => {
    const profile = ref<TeacherProfile | null>(null)
    const legacyUserInfo = ref<UserInfo>({ ...emptyUserInfo })
    const bootstrapping = ref(false)
    let bootstrapTask: Promise<TeacherProfile | null> | null = null

    const userInfo = computed<UserInfo>(() => {
      return profile.value ? toUserInfo(profile.value) : legacyUserInfo.value
    })

    const hasLogin = computed(() => Boolean(profile.value))

    function setProfile(value: TeacherProfile) {
      profile.value = value
      legacyUserInfo.value = toUserInfo(value)
    }

    function clearProfile() {
      profile.value = null
      legacyUserInfo.value = { ...emptyUserInfo }
    }

    async function loginByPassword(username: string, password: string) {
      const result = await requestTeacherLoginByPassword(username, password)
      setProfile(result.profile)
      return result.profile
    }

    async function loginByOpenid() {
      const result = await requestTeacherLoginByOpenid()
      if (result) {
        setProfile(result)
      }
      return result
    }

    async function updateProfile(input: TeacherProfileUpdateInput) {
      const result = await requestTeacherUpdateProfile(input)
      setProfile(result.profile)
      return result.profile
    }

    async function bootstrapAuth() {
      if (profile.value) {
        return profile.value
      }
      if (bootstrapTask) {
        return bootstrapTask
      }
      bootstrapping.value = true
      bootstrapTask = loginByOpenid()
        .catch((error: unknown) => {
          if (error instanceof CloudFunctionError && (error.code === 2002 || error.code === 2003)) {
            return null
          }
          throw error
        })
        .finally(() => {
          bootstrapping.value = false
          bootstrapTask = null
        })
      return bootstrapTask
    }

    function logout() {
      clearProfile()
      uni.removeStorageSync('user')
    }

    function setUserInfo(value: UserInfo) {
      legacyUserInfo.value = value.avatar
        ? value
        : { ...value, avatar: emptyUserInfo.avatar }
    }

    function setUserAvatar(avatar: string) {
      legacyUserInfo.value = { ...legacyUserInfo.value, avatar }
    }

    function clearUserInfo() {
      clearProfile()
    }

    async function fetchUserInfo() {
      return userInfo.value
    }

    return {
      profile,
      userInfo,
      bootstrapping,
      hasLogin,
      bootstrapAuth,
      clearProfile,
      clearUserInfo,
      fetchUserInfo,
      loginByOpenid,
      loginByPassword,
      logout,
      setProfile,
      setUserAvatar,
      setUserInfo,
      updateProfile,
    }
  },
  {
    persist: true,
  },
)
