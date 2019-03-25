
import { clusterConfig } from './config';
import { isMaster, workers } from 'cluster';
import { createInterface } from 'readline';

let shutdownTimeout: number = 30000;
let _isShuttingDown: boolean = false;

interface ShutdownHandler {
	(): Promise<void>;
}

const shutdownHandlers: ShutdownHandler[] = [ ];

/**
 * Returns the shutdown status of the cluster. `true` for shutting down, `false` for running
 */
export const isShuttingDown = () : boolean => _isShuttingDown;

/**
 * Defines the amount of time (in milliseconds) the cluster should wait for tasks to finish
 * up before forcing them to exit.
 */
export const setShutdownTimeout = (timeout: number) : void => {
	shutdownTimeout = timeout;
};

/**
 * Adds a new listener, to be called when the server is preparing to shutdown
 */
export const addOnShutdown = (callback: ShutdownHandler) => {
	shutdownHandlers.push(callback);
};

/**
 * Removes an existing listener from the on shutdown handler list
 */
export const removeOnShutdown = (callback: ShutdownHandler) => {
	for (let i = 0; i < shutdownHandlers.length; i++) {
		if (shutdownHandlers[i] === callback) {
			shutdownHandlers.splice(i--, 1);
		}
	}
};

/**
 * Shuts down the cluster after allowing running tasks to clean up
 *
 * @param exitCode The exit code for the process to exit with
 */
export const shutdown = async (exitCode: number = 0) : Promise<void> => {
	_isShuttingDown = true;

	clusterConfig.log('Beginning shutdown process', {
		exitCode,
		timeout: shutdownTimeout
	});

	const timeout = setTimeout(forceShutdown, shutdownTimeout, exitCode);
	const promises = shutdownHandlers.slice().map((func) => func())

	await Promise.all(promises);

	clearTimeout(timeout);
	process.exit(exitCode);
};

const forceShutdown = (exitCode: number = 0) : void => {
	clusterConfig.log('Failed to shutdown within the allotted time, forcing shutdown', { exitCode });
	process.exit(exitCode);
};

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());

// On windows, we have to do some bullshit to catch the interupt signal
// directly from STDIN so we will be able to shutdown using Crtl+C
if (process.platform === 'win32') {
	if (isMaster) {
		const stdio = createInterface({
			input: process.stdin,
			output: process.stdout
		});

		stdio.on('SIGINT', () => {
			// When we catch the SIGINT here, we emit a fake SIGINT event on `process` to trigger
			// the other handler, and we also send an event down to all the workers to inform them
			// to do the same
			// @ts-ignore SIGINT is an "internal" event sort of, but we're gonna throw it anyway
			process.emit('SIGINT');

			Object.keys(workers).forEach((id) => {
				workers[id].send({ _dest: 'shutdown', event: 'SIGINT' });
			});
		});
	}

	else {
		process.on('message', (message) => {
			if (message._dest === 'shutdown' && message.event === 'SIGINT') {
				// @ts-ignore SIGINT is an "internal" event sort of, but we're gonna throw it anyway
				process.emit('SIGINT');
			}
		});
	}
}
