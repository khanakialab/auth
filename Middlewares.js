var jwt = require('jsonwebtoken');
var mongo = require('mongodb');

exports.authMiddleware = async (req, res, next) => {
	// console.log(req.headers)

	// if(req.path.indexOf("users/login") !== -1) {
	//   return next()
	// }

	if (!req.headers.authorization) {
		res.status(400);
		return res.json({
			error: _e('No credentials sent!', 'Core/Auth')
		});
	}

	var header = req.headers.authorization.split(' ');
	var token = header[1];
	if (token) {

		jwt.verify(token, APP_SECRET, function (err, decoded) {
			if (!err) {
				// console.log(decoded)
				req.decoded = decoded;
				// USERID = parseInt(decoded.id)
				USER = decoded
				req.user = decoded
			}
		});

	} else {
		// if there is no token
		// return an error
		return res.status(403).send({ 
		    success: false, 
		    message: _e('Please log in first.', 'Core/Auth')
		});
	}

	if(!USER) {
		return res.status(400).send({ 
		    success: false, 
		    message: _e('Please log in first.', 'Core/Auth')
		});
	}
	
	var o_id = new mongo.ObjectID(USER._id);

	const user =  await Auth_Module.User.collection.findOne({"_id" : o_id})
	if(!user) {
		return res.status(403).send({ 
		    success: false, 
		    message: _e('User not found.', 'Core/Auth')
		});
	}

	if(user && !user.status) {
		return res.status(403).send({ 
		    success: false, 
		    message: _e('User is disabled.', 'Core/Auth')
		});
	}

	USER = user
	req.user = user
	next();
};
