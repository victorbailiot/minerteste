export interface SendRegisterSmsCodeResult {
  verificationId: string
  expiresAt: string
  expiresInSeconds: number
  retryAfterSeconds: number
}

export interface VerifyRegisterSmsCodeResult {
  verificationToken: string
  verifiedAt: string
}
