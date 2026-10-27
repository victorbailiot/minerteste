export interface Tree {
  id: number
  name: string
  email: string
  position: string
  leftPoints?: number
  rightPoints?: number
  level: number
  isActive: boolean
  left: Tree | null
  right: Tree | null
}