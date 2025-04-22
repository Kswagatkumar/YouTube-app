const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        // if the requestHandler throws an error or returns a rejected promise, 
        // the catch block will be executed and the error will be passed to the next middleware
        Promise.resolve(requestHandler(req, res, next))
            .catch(err => next(err)); 
    };
};
export { asyncHandler };

/* whats this ? 
 this is done use of try catch
 const  asyncHandler = ()=>{}qqqq
 const asyncHandler = (func) => ()=>{}
now  to make it async const asyncHandler = (func) => async (req, res, next) => {}
*/
 /*const asyncHandler = fn => async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      res.status(err.code || 500).json({
        success: false,
        message: err.message,
      });
    }
  };
  this is a higher order js function
  */
