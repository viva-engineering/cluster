
import './shutdown';
import { isMaster } from 'cluster';
import { setConfig, ClusterConfig } from './config';

export { isShuttingDown, setShutdownTimeout, addOnShutdown, removeOnShutdown, shutdown } from './shutdown';

export const initCluster = (config: ClusterConfig) => {
	setConfig(config);

	// If we are running in single-threaded mode, just start the server
	if (! config.threads || ! isMaster) {
		if (config.log) {
			config.log('Worker started', { pid: process.pid });
		}

		require(config.worker);
	}

	// Otherwise, start up the clustered system
	else {
		if (config.log) {
			config.log('Master started', { pid: process.pid });
		}

		require('./master').init(config);
	}
};
