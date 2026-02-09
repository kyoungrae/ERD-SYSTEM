import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
});

export const sendVerificationEmail = async (to: string, code: string) => {
    // If no credentials are set, log to console for development
    if (!config.email.user || !config.email.pass) {
        console.log('-----------------------------------------');
        console.log(`📧 Email Verification Code for ${to}: ${code}`);
        console.log('Set EMAIL_USER and EMAIL_PASS in .env to send real emails.');
        console.log('-----------------------------------------');
        return;
    }

    try {
        await transporter.sendMail({
            from: config.email.from,
            to,
            subject: '[ERD System] 회원가입 인증 코드입니다',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
                    <h2 style="color: #2563eb; margin-bottom: 24px;">인증 코드를 입력해주세요</h2>
                    <p style="color: #475569; line-height: 1.6;">안녕하세요. ERD System 회원가입을 위한 인증 코드입니다.</p>
                    <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">${code}</span>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">본 코드는 5분 후 만료됩니다. 본인이 요청하지 않았다면 이 메일을 무시하셔도 좋습니다.</p>
                    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">© 2026 ERD System</p>
                </div>
            `,
        });
    } catch (error) {
        console.error('Failed to send verification email:', error);
        throw new Error('이메일 발송에 실패했습니다.');
    }
};
