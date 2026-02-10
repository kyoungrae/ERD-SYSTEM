import { Response } from 'express';
import { Project } from '../models/Project';
import { AuthRequest } from '../middleware/authMiddleware';
import { Types } from 'mongoose';

export const createProject = async (req: AuthRequest, res: Response) => {
    try {
        const { name, dbType, description } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: '사용자 인증이 필요합니다.' });
        }

        const project = new Project({
            name,
            dbType,
            description,
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'OWNER',
                joinedAt: new Date()
            }],
            currentSnapshot: {
                version: 1,
                entities: [],
                relationships: [],
                savedAt: new Date()
            }
        });

        await project.save();

        // Populate owner info before responding
        await project.populate('members.userId', 'name email picture');

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ message: '프로젝트 생성 중 오류가 발생했습니다.' });
    }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: '사용자 인증이 필요합니다.' });
        }

        const projects = await Project.find({
            'members.userId': new Types.ObjectId(userId)
        })
            .populate('members.userId', 'name email picture')
            .sort({ updatedAt: -1 });

        res.set('Cache-Control', 'no-store');
        res.json(projects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ message: '프로젝트 목록을 가져오는 중 오류가 발생했습니다.' });
    }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: '사용자 인증이 필요합니다.' });
        }

        const project = await Project.findOne({
            _id: id,
            'members.userId': new Types.ObjectId(userId),
            'members.role': 'OWNER'
        });

        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없거나 삭제 권한이 없습니다.' });
        }

        await Project.findByIdAndDelete(id);

        res.json({ message: '프로젝트가 삭제되었습니다.' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ message: '프로젝트 삭제 중 오류가 발생했습니다.' });
    }
};
export const updateProject = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, data } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: '사용자 인증이 필요합니다.' });
        }

        const project = await Project.findOne({
            _id: id,
            'members.userId': new Types.ObjectId(userId)
        });

        if (!project) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없거나 수정 권한이 없습니다.' });
        }

        // Check if member is OWNER or EDITOR
        const member = project.members.find(m => m.userId.toString() === userId);
        if (member?.role === 'VIEWER') {
            return res.status(403).json({ message: '수정 권한이 없습니다.' });
        }

        if (name) project.name = name;
        if (description !== undefined) project.description = description;
        if (data) {
            project.currentSnapshot = {
                ...data,
                version: (project.currentSnapshot?.version || 0) + 1,
                savedAt: new Date()
            };
        }

        await project.save();
        res.json(project);
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ message: '프로젝트 수정 중 오류가 발생했습니다.' });
    }
};
