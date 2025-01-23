import multer, { diskStorage } from "multer";

const storage = multer/diskStorage({
    destination: function(req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueSuffix);
    }
});

export const upload = multer({storage})