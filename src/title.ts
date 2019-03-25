
import { spawnSync } from 'child_process';
import { clusterConfig } from './config';

/**
 * Sets the title on the terminal
 *
 * @param title The new title value to use
 */
export const setTitle = (title: string) : void => {
	if (process.platform === 'win32') {
		spawnSync('cmd.exe', [ '/C', `title ${title}` ], { shell: true });
	}

	else {
		process.stdout.write(`\x1b]2;${title}\x1b\x5c`);
	}
};

/**
 * Sets the terminal title based on config and the given status string
 *
 * @param status The current status to be displayed in the title
 */
export const setTitleForStatus = (status: string) : void => {
	const base = clusterConfig.title || 'node cluster';
	const title = `[${status}] ${base}`;
};
