import {v2 as cloudinary} from 'cloudinary';
import {CloudinaryStorage} from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

//1. configure cloudinary with env variables
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

//2. set up multer to use clean memory storage (no local files saved on disks)
// const storage = multer.memoryStorage();
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wandrly_covers', // The directory name inside your Cloudinary Media Library
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 500, crop: 'limit' }] // Optimizes image sizes automatically!
  },
});

export const uploadMiddleware = multer({
    storage,
    limits:{
        fileSize: 5 * 1024 * 1024//5mb limit to prevent overload 
    }
});

//3. helper to turn a memory buffer into a cloudinary upload stream 
export const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve,reject)=>{
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder:"wandrly_travelogue"//organises uploads into a folder
            },
            (error,result)=>{
                if(error)return reject(error);
                resolve(result.secure_url);//returns the permanent public HTTPS link
            }
        );

        //write the fileBuffer directly to cloud streaming pipe
        uploadStream.end(fileBuffer);
    });
};

// helper to delete an image from cloudinary using the public URL string
export const deleteFromCloudinary = async (fileUrl) => {
  try {
    // 1. Split the URL to grab everything after "/upload/"
    const urlParts = fileUrl.split('/upload/');
    if (urlParts.length !== 2) {
      throw new Error("INVALID_CLOUDINARY_URL");
    }

    let publicIdString = urlParts[1];

    // 2. Strip out the dynamic version number (e.g., "v1779364956/") 
    publicIdString = publicIdString.replace(/^v\d+\//, '');

    // 3. Strip off the file extension (e.g., ".jpg", ".png")
    const publicId = publicIdString.split('.')[0];

    // 4. Fire destruction request to Cloudinary API using the clean publicId
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok' && result.result !== 'not found') {
      console.warn(`⚠️ Cloudinary reporting non-optimal deletion state: ${result.result}`);
    }
    
    return result;
  } catch (error) {
    console.error("☁️ Cloudinary Deletion Core Error:", error);
    throw new Error("CLOUD_DELETION_FAILED");
  }
};