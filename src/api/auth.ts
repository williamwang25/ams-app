import type { TeacherLoginResult, TeacherProfile, TeacherProfileUpdateInput } from '@/types/auth'
import { callCloud, CloudFunctionError } from '@/utils/cloud'

export function teacherLoginByPassword(username: string, password: string) {
  return callCloud<TeacherLoginResult>('auth', 'teacherLoginByPassword', { username, password })
}

export async function teacherLoginByOpenid(): Promise<TeacherProfile | null> {
  try {
    const result = await callCloud<TeacherLoginResult>('auth', 'teacherLoginByOpenid')
    return result.profile
  }
  catch (error) {
    if (error instanceof CloudFunctionError && error.code === 2003) {
      return null
    }
    throw error
  }
}

export function teacherUpdateProfile(input: TeacherProfileUpdateInput) {
  return callCloud<TeacherLoginResult>('auth', 'teacherUpdateProfile', input)
}
