
import { cpus } from 'os';
import * as cluster from 'cluster';
import { ClusterConfig } from './index';

const noopLog = (message: string, meta?: object) => { };

export const init = (config: ClusterConfig) => {
	const log = config.log || noopLog;

	// Figure out the max number of workers we're allowed to spawn at once
	const maxWorkers: number = (() => {
		if (config.threads !== 'auto') {
			return config.threads;
		}

		const availableCpus = cpus().length;

		return config.extraCpus
			? Math.max(1, availableCpus - config.extraCpus)
			: availableCpus;
	})();

	// If the worker heap size was configured explicitly, set that up now
	if (config.heapSize) {
		cluster.setupMaster({
			execArgv: process.execArgv.concat([ `--max_old_space_size=${config.heapSize}` ])
		})
	}

	// Spin up the initial batch of workers
	for (let i = 0; i < maxWorkers; i++) {
		cluster.fork();
	}

	let respawnBackoff: number = 0;

	/**
	 * Respawns a single dead worker
	 */
	const respawnWorker = () => {
		const backoff = respawnBackoff++;
		const delay = 1000 * 2 ** (backoff + Math.random());

		const spawn = () => {
			setTimeout(() => respawnBackoff--, 1000);
			cluster.fork();
		};

		log('Scheduling cluster worker respawn', { delay: `${delay}ms` });
		setTimeout(spawn, delay);
	};

	/**
	 * Runs when a worker crashes. If all workers have crashed, it will shutdown the server. Otherwise, it
	 * will attempt to respawn the crashed worker.
	 */
	const handleWorkerDeath = (worker: cluster.Worker, code: number, signal: string) => {
		log('Cluster worker shutdown', {
			pid: worker.process.pid,
			code,
			signal
		})

		if (Object.keys(cluster.workers).length === 0) {
			log('All cluster workers have shutdown; Exiting');
			process.exit(1);

			return;
		}

		respawnWorker();
	};

	// When a worker dies, queue up the handler to take care of it
	cluster.on('exit', (worker, code, signal) => {
		setTimeout(() => handleWorkerDeath(worker, code, signal), 100);
	});
};
