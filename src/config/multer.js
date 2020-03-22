import multer from 'multer';
import crypto from 'crypto';
import { extname, resolve } from 'path';

export default {
  storage: multer.diskStorage({
    destination: resolve(
      __dirname,
      '..',
      '..',
      'temp',
      'uploads'
    ),
    filename: (req, file, cb) => {
      // generates 16 random bytes for unique name
      crypto.randomBytes(16, (err, res) => {
        if (err) return cb(err);

        return cb(
          null, // null instead of error
          res.toString('hex') +
            extname(file.originalname) // takes the 16 random bytes + extension name
        );
      });
    }
  })
};
