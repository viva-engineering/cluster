
export let clusterConfig: ClusterConfig;

export const setConfig = (config: ClusterConfig) => {
	clusterConfig = config;
};

export interface ClusterConfig {
	/**
	 * The number of worker threads to start. Set to 0 to run in single-threaded
	 * mode (no cluster). Set to 'auto' to let the server figure out how many workers
	 * to start based on the number of available CPUs
	 */
	threads: number | 'auto',

	/** The max heap size (in MB) to allocate to each worker */
	heapSize?: number,

	/**
	 * When using `threads: 'auto'`, the server will try to leave this many CPUs on the
	 * machine available for other work
	 */
	extraCpus?: number,

	/**
	 * The (full) path to the script that actually runs your server
	 */
	worker: string,

	/**
	 * The method to use when logging messages related to clustering events, like when new
	 * workers are spawned, or when a worker process crashes.
	 *
	 * @param message The message to be logged
	 * @param meta Any additional meta data that goes along with the message
	 */
	log?: (message: string, meta?: object) => void
}
