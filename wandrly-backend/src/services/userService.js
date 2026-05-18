import bcrypt from 'bcrypt';

/*
Latest prisma version requires an adapter to connect to postgres, we are using the official PrismaPg adapter. We create a new PrismaClient instance with the adapter and use it to interact with the database in our service functions.

Not using this adapter would result in an error when trying to connect to the database, as the default PrismaClient does not support postgres without an adapter. The adapter handles the connection and query execution for postgres, allowing us to use Prisma's API to perform database operations seamlessly, and allows perfect compatibility with strict ES modules in node, and it can now be easily deployed to platforms like Vercel without any issues related to database connectivity.
*/
import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';

export const createUser = async(name,email,plainTextPassword)=>{
    const hashedPassword = await bcrypt.hash(plainTextPassword,10);//hash the password with a salt rounds of 10

    //create a new user record in the database using Prisma's create method, passing the name, email, and hashed password as data

    const user = await prisma.user.create({
        data:{
            name:name,
            email:email,
            password_hash:hashedPassword,
        }
    });

    return user;
};

export const loginUser = async(email,plainTextPassword)=>{
    //1. find user by email
    const user = await prisma.user.findUnique({
        where:{email:email}
    });

    if(!user){
        throw new Error("Invalid email or password.");
    }

    //2. compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(plainTextPassword,user.password_hash);

    if(!isMatch){
        throw new Error("Invalid email or password.");
    }

    //3. generate the JWT , put only non-sensitive data in the token payload, never include the password hash or any sensitive info
    const token = jwt.sign(
        {
            userId:user.id,
            email:user.email,
        },
        process.env.JWT_SECRET,
        {
            expiresIn:'7d',//token expires in 7 days
        }
    );

    return {user,token};//return the user data and the generated token
}