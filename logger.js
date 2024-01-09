/**
 * Simple Common Logging Format utility for NodeJS
 *
 * usage:  call init() method at app startup. Use various logging methods as desired.
 *
 * INITIALIZATION
 * There is some one-time initialization to set the applicationId, applicationName and instanceId. These are all
 * avaliable in process.env.VCAP_APPLICATION, or you can define some convenience methods in your vcapServices
 * file like so:
 *
 *     const logger = require('./logger').logger;
 *     logger.init(vcapServices.getApplicationId(), vcapServices.getApplicationName(), vcapServices.getInstanceIndex());
 *
 * REQUEST CONTEXT
 * The recommended way to set the request level properties (tenant and correlation id) is to add some middleware
 * that is executed for every request, like so:
 *
 *     var  app = express();
 *     app.use((req, res, next) => {
 *         logger.setContext(req);
 *         next();
 *     });
 *
 * LOGGING
 * After that, all logging statements are very simple:
 *     logger.info('some logging message');
 *
 * If you don't want to use the middleware approach, you can supply the request with each logging statement:
 *     logger.info(req, 'some other message');
 *
 * sample log entry:
 * {"time":"2018-03-07T21:13:50.849","tnt":"2bcdb0d5-e95e-4fe5-b97a-1d979abca5d9","corr":"a07c9244b37b1961",
 * "appn":"apm-analysis-data-svc-local","dpmt":"bbb60ff8-615b-4a02-8ecf-b3e89906b9ed","inst":"na","lvl":"INFO",
 * "msg":"prefetch/alarm - alarmId=A7406BB24A504E6EA728B17EA08D04EE"}
 *
 */

const NOT_AVAILABLE = 'na';

const LEVEL_INFO = 'INFO';
const LEVEL_DEBUG = 'DEBUG';
const LEVEL_ERROR = 'ERROR';

class Logger {
	constructor() {
		this.deploymentId = NOT_AVAILABLE;
		this.applicationName = NOT_AVAILABLE;
		this.instanceIndex = null;
		this.module = NOT_AVAILABLE;

		// current request context
		this.corr = NOT_AVAILABLE;
		this.tnt = NOT_AVAILABLE;
	}

	// one-time initializaition
	init(depId, appName, instanceIndex, module) {
		this.deploymentId = depId || NOT_AVAILABLE;
		this.applicationName = appName || NOT_AVAILABLE;
		if (typeof instanceIndex !== 'undefined') {
			this.instanceIndex = instanceIndex;
		}
		this.instanceIndex = instanceIndex || '0';
		this.module = module || NOT_AVAILABLE;
	}

	getCorrId(traceId) {
	        let xAmznTraceId;
	        if (traceId) {
	            const rootIdx = traceId.indexOf('Root');
	            if (rootIdx != -1) {
	                xAmznTraceId = traceId.substring(rootIdx + 7, rootIdx + 40).replace('-', '');
	            }
	        }
	        return xAmznTraceId;
	}

	/**
	 * set the context for a single request
	 * @param req - HTTP request obj
	 */
	setContext(req) {
		this.tnt = req && req.headers ? (req.headers.tenant || NOT_AVAILABLE) : NOT_AVAILABLE;
		this.corr = req && req.headers ? (this.getCorrId(req.headers['x-amzn-trace-id']) || NOT_AVAILABLE) : NOT_AVAILABLE;
	}
	/**
	 * General logging method
	 * @param levelOrMsg - logging level
	 * @param msg - message to log
	 */
	log(reqOrLevel, levelOrMsg, msg) {

		// deal with optional request
		const level = msg ? levelOrMsg : reqOrLevel;
		const tnt = msg && reqOrLevel && reqOrLevel.headers ? (reqOrLevel.headers.tenant || NOT_AVAILABLE) : this.tnt;
		const corr = msg && reqOrLevel && reqOrLevel.headers ? (this.getCorrId(reqOrLevel.headers['x-amzn-trace-id']) || NOT_AVAILABLE) : this.corr;
		const message = msg || levelOrMsg;

		// create obj with required properties
		const logJSON = {
			time: new Date().toISOString().split('Z')[0],
			tnt: tnt,
			corr: corr,
			appn: this.applicationName,
			dpmt: this.deploymentId
		};
		// for optional properties, only add them if we have something interesting to say
		if (this.module !== NOT_AVAILABLE) {
			logJSON.mod = this.module;
		}
		if (this.instanceIndex) {
			logJSON.inst = this.instanceIndex;
		}
		if (level) {
			logJSON.lvl = level;
		}
		if (message) {
			if (Object.prototype.toString.call(message) === '[object String]') {
				logJSON.msg = message;
			} else {
				logJSON.msg = message.toString();
			}
		}
		try {
			// eslint-disable-next-line
			console.log(JSON.stringify(logJSON));
		} catch (error) {
			// eslint-disable-next-line
			console.log('Error converting logging JSON to a string');
		}
	}

	// convenience method for logging INFO level msgs
	info(reqOrMsg, msg) {
		if (msg) {
			this.log(reqOrMsg, LEVEL_INFO, msg);
		} else {
			this.log(LEVEL_INFO, reqOrMsg); // if only one arg, it is the msg
		}
	}

	// convenience method for logging DEBUG level msgs
	debug(reqOrMsg, msg) {
		if (msg) {
			this.log(reqOrMsg, LEVEL_DEBUG, msg);
		} else {
			this.log(LEVEL_DEBUG, reqOrMsg); // if only one arg, it is the msg
		}
	}
	// convenience method for logging ERROR level msgs
	error(reqOrMsg, msg) {
		if (msg) {
			this.log(reqOrMsg, LEVEL_ERROR, msg);
		} else {
			this.log(LEVEL_ERROR, reqOrMsg); // if only one arg, it is the msg
		}
	}
}

const logger = new Logger();

module.exports = {
	logger: logger
};
