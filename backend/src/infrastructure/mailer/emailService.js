class EmailService {
  constructor() {
    this.sentEmails = [];
  }

  async sendPasswordResetEmail({ email, token, code, resetUrl }) {
    const record = {
      to: email,
      subject: 'Yêu cầu đặt lại mật khẩu - Cờ Tướng Online',
      token,
      code,
      resetUrl,
      sentAt: new Date(),
    };
    this.sentEmails.push(record);
    return true;
  }
}

module.exports = new EmailService();
