import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';

export const signup = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: '이미 가입된 이메일입니다.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            email,
            password: hashedPassword,
            name,
        });

        await user.save();

        const token = jwt.sign({ id: user._id }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn as any,
        });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: '회원가입 중 오류가 발생했습니다.' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !user.password) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        user.lastLoginAt = new Date();
        await user.save();

        const token = jwt.sign({ id: user._id }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn as any,
        });

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: '로그인 중 오류가 발생했습니다.' });
    }
};
