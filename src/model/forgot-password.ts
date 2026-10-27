export interface SendPasswordResetSmsCodeResult {
  verificationId: string
  expiresAt: string
  expiresInSeconds: number
  retryAfterSeconds: number
}

export interface VerifyPasswordResetSmsCodeResult {
  verificationToken: string
  verifiedAt: string
}
