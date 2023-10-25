import { NextFunction, Request, Response, Router } from 'express';
import { User } from '../entities/User';
import userMiddleware from '../middlewares/user';
import authMiddleware from '../middlewares/auth';
import { isEmpty } from 'class-validator';
import { AppDataSource } from '../data-source';
import Sub from '../entities/Sub';
import Post from '../entities/Post';
import multer, { FileFilterCallback } from 'multer';
import { makeId } from '../utils/helpers';
import path from 'path';
import { fstat, unlinkSync } from 'fs';

const getSub = async (req: Request, res: Response) => {
    const name = req.params.name;
    try {
        const sub = await Sub.findOneByOrFail({ name });

        // 포스트를 생성한 후에 해당 sub에 속하는 포스트 정보들을 넣어주기
        const posts = await Post.find({
            where: { subName: sub.name },
            order: { createdAt: 'DESC' },
            relations: ['comments', 'votes'],
        });

        sub.posts = posts;

        if (res.locals.user) {
            sub.posts.forEach((p) => p.setUserVote(res.locals.user));
        }

        return res.json(sub);
    } catch (error) {
        return res.status(404).json({ error: 'Cannot find the community.' });
    }
};

const createSub = async (req: Request, res: Response, next) => {
    const { name, title, description } = req.body;

    try {
        let errors: any = {};
        if (isEmpty(name)) errors.name = 'Name cannot be empty.';
        if (isEmpty(title)) errors.title = 'Title cannot be empty.';

        const sub = await AppDataSource.getRepository(Sub)
            .createQueryBuilder('sub')
            .where('lower(sub.name) = :name', { name: name.toLowerCase() })
            .getOne();

        if (sub) errors.name = 'Sub is already exist.';
        if (Object.keys(errors).length > 0) {
            throw errors;
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error Occurred.' });
    }

    try {
        const user: User = res.locals.user;

        const sub = new Sub();
        sub.name = name;
        sub.description = description;
        sub.title = title;
        sub.user = user;

        await sub.save();
        return res.json(sub);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error Occurred.' });
    }
};

const topSubs = async (req: Request, res: Response) => {
    try {
        const imageUrlExp = `COALESCE('${process.env.APP_URL}/images/' ||s."imageUrn",'https://www.gravatar.com/avatar?d=mp&f=y')`;
        const subs = await AppDataSource.createQueryBuilder()
            .select(`s.title, s.name, ${imageUrlExp} as "imageUrl", count(p.id) as "postCount"`)
            .from(Sub, 's')
            .leftJoin(Post, 'p', `s.name = p."subName"`)
            .groupBy('s.title, s.name, "imageUrl"')
            .orderBy(`"postCount"`, 'DESC')
            .limit(5)
            .execute();
        return res.json(subs);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error Occurred.' });
    }
};

const ownSub = async (req: Request, res: Response, next: NextFunction) => {
    const user: User = res.locals.user;
    try {
        const sub = await Sub.findOneOrFail({ where: { name: req.params.name } });

        if (sub.username !== user.username) {
            return res.status(403).json({ error: 'Do not have an authorization.' });
        }

        res.locals.sub = sub;
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: ' Error Occurred.' });
    }
};

const upload = multer({
    storage: multer.diskStorage({
        destination: 'public/images',
        filename: (_, file, callback) => {
            const name = makeId(10);
            callback(null, name + path.extname(file.originalname));
        },
    }),
    fileFilter: (_, file: any, callback: FileFilterCallback) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            callback(null, true);
        } else {
            callback(new Error('Not an image.'));
        }
    },
});

const uploadSubImage = async (req: Request, res: Response) => {
    const sub: Sub = res.locals.sub;
    try {
        const type = req.body.type;
        // 파일 유형을 지정치 않았을 시에는 업로든 된 파일 삭제
        if (type !== 'image' && type !== 'banner') {
            if (!req.file?.path) {
                return res.status(400).json({ error: 'Invalid file' });
            }

            // 파일을 지워주기
            unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Invalid type' });
        }

        let oldImageUrn: string = '';

        if (type === 'image') {
            // 사용중인 Urn 을 저장합니다. (이전 파일을 아래서 삭제하기 위해서)
            oldImageUrn = sub.imageUrn || '';
            // 새로운 파일 이름을 Urn 으로 넣어줍니다.
            sub.imageUrn = req.file?.filename || '';
        } else if (type === 'banner') {
            oldImageUrn = sub.bannerUrn || '';
            sub.bannerUrn = req.file?.filename || '';
        }
        await sub.save();

        // 사용하지 않는 이미지 파일 삭제
        if (oldImageUrn !== '') {
            const fullFilename = path.resolve(process.cwd(), 'public', 'images', oldImageUrn);
            unlinkSync(fullFilename);
        }

        return res.json(sub);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error Occurred.' });
    }
};

const router = Router();

router.get('/:name', userMiddleware, getSub);
router.post('/', userMiddleware, authMiddleware, createSub);
router.get('/sub/topSubs', topSubs);
router.post('/:name/upload', userMiddleware, authMiddleware, ownSub, upload.single('file'), uploadSubImage);
export default router;
