export interface TeacherProfile {
  _id: string
  username: string
  name: string
  department: string
  phone: string
  openid: string
}

export interface TeacherLoginResult {
  profile: TeacherProfile
}

export interface TeacherProfileUpdateInput {
  name: string
  department?: string
  phone?: string
}
