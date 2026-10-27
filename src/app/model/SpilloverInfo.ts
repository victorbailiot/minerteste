export interface SpilloverInfo {
  sponsorId: bigint
  parentId: bigint
  position: 'LEFT' | 'RIGHT'
  level: number
  path: string[]
}