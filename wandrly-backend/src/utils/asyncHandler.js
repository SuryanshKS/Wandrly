// This function takes another function (your controller) as an argument
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        // It runs your controller, and if any promise rejects (fails), 
        // it instantly catches it and passes it to Express's 'next' function
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export default asyncHandler;