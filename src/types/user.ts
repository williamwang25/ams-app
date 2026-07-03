export type UserRole = 'teacher' | ''

export interface UserInfo {
  userId: number
  username: string
  nickname: string
  avatar?: string
  role?: UserRole
  roles?: UserRole[]
  teacherId?: string
  department?: string
  phone?: string
}
