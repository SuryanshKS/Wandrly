import {v2 as cloudinary} from 'cloudinary';
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
const storage = multer.memoryStorage();

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

//helper to delete an image from cloudinary using the public URL string
export const deleteFromCloudinary = async(fileUrl)=>{
    try{
        // Extract the public ID from the URL string
        // Matches everything after /upload/vxxxxxxxxx/ and removes the extension (.jpg/.png)
        const urlParts = fileUrl.split('/');
        const folderIndex = urlParts.indexOf('wandrly_travelogue');
        
        if (folderIndex === -1) throw new Error("INVALID_CLOUDINARY_URL");

        // Constructs 'wandrly_travelogue/filename'
        const publicIdWithExtension = urlParts.slice(folderIndex).join('/');
        const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));

        // Fire destruction request to Cloudinary API
        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result !== 'ok') {
            console.warn(`⚠️ Cloudinary reporting non-optimal deletion state: ${result.result}`);
        }
        return result;
    }catch (error) {
        console.error("☁️ Cloudinary Deletion Core Error:", error);
        throw new Error("CLOUD_DELETION_FAILED");
    }
}